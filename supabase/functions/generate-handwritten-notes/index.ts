import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Handwritten Notes generator.
 *
 * Root cause of previous "Gemini rate limit" errors: the direct Gemini free
 * tier caps at ~5 RPM per key, and each subtopic fires several sequential
 * calls. The AI Chat feature doesn't hit the same wall because it uses the
 * Lovable AI Gateway (google/gemini-2.5-flash-lite) which has a much higher
 * effective throughput.
 *
 * Fix: PRIMARY = Lovable AI Gateway (google/gemini-2.5-flash-lite via the
 * OpenAI-compatible endpoint). FALLBACK = direct Gemini 2.5 Flash. This is
 * the same reliability model the chat uses.
 */
const BodySchema = z.object({
  subtopicKey: z.string().min(1).max(300),
  year: z.string().min(1).max(40),
  subject: z.string().min(1).max(120),
  subtopicName: z.string().min(1).max(200),
  questions: z.array(z.string().max(1000)).min(1).max(400),
  batchIndex: z.number().int().min(0).max(200).optional(),
  batchSize: z.number().int().min(1).max(20).optional(),
  regenerate: z.boolean().optional(),
  saveContent: z.boolean().optional(),
  content: z.any().optional(),
});

const DEFAULT_BATCH_SIZE = 6;
const EST_SECONDS_PER_BATCH = 12;

const SYSTEM_PROMPT = `You are an expert MBBS professor generating exam-ready HANDWRITTEN-STYLE study notes.
Given a SUBTOPIC and its previous-year essay + short-note questions, synthesise ONE unified study page.

Output MUST be VALID JSON only (no markdown fence, no prose) matching this exact schema:

{
  "highYieldTip": string,
  "pyqYears": string[],
  "sections": [
    {
      "type": "definition" | "bullets" | "steps" | "morphology" | "comparison" | "table" | "outcome" | "text",
      "title": string,
      "icon": string,
      "pyqYears": string[]?,
      "payload": object
    }
  ]
}

Payload shapes by type:
- definition:  { "text": string }
- text:        { "paragraph": string }
- bullets:     { "items": [ { "label": string, "description": string } ] }
- steps:       { "items": [ { "title": string, "description": string, "keyTrigger"?: string } ] }
- morphology:  { "subtitle"?: string, "items": [ { "title": string, "tag"?: "CLASSIC" | "PATHOGNOMONIC" | "COMMON", "details": string[] } ] }
- comparison:  { "left": string, "right": string, "rows": [ { "label": string, "left": string, "right": string } ] }
- table:       { "columns": string[], "rows": string[][] }
- outcome:     { "text": string }

Strict rules:
- DO NOT include page numbers or textbook citations.
- Cover ALL the essay + short-note questions inside the sections; don't leave any question un-addressed.
- Prefer comparison and table sections wherever two entities are contrasted or classified.
- Keep language crisp, exam-ready. No markdown asterisks.
- Response MUST be JSON only, starting with { and ending with }.`;

class UpstreamError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

/** PRIMARY: Lovable AI Gateway (OpenAI-compatible). */
async function callLovableGateway(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.55,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new UpstreamError(res.status, `Lovable ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new UpstreamError(500, "Empty response from Lovable Gateway");
  return text;
}

/** FALLBACK: direct Gemini. */
async function callGeminiDirect(apiKey: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.55,
        topP: 0.9,
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new UpstreamError(res.status, `Gemini ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) throw new UpstreamError(500, "Empty response from Gemini");
  return text;
}

async function callModel(prompt: string): Promise<string> {
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const gemini = Deno.env.get("GEMINI_API_KEY");
  const delays = [1500, 4000];
  let lastErr: unknown = null;

  // Try Lovable Gateway first with 2 retries on transient
  if (lovable) {
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await callLovableGateway(lovable, prompt);
      } catch (e) {
        lastErr = e;
        const status = e instanceof UpstreamError ? e.status : 0;
        // 429 / 402 / 5xx — retry or fall through to direct Gemini
        if (![429, 500, 502, 503, 504].includes(status)) break;
        if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }

  // Fallback: direct Gemini
  if (gemini) {
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await callGeminiDirect(gemini, prompt);
      } catch (e) {
        lastErr = e;
        const status = e instanceof UpstreamError ? e.status : 0;
        if (![429, 500, 502, 503, 504].includes(status)) throw e;
        if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }

  if (!lovable && !gemini) {
    throw new Error("Neither LOVABLE_API_KEY nor GEMINI_API_KEY configured");
  }
  throw lastErr ?? new Error("Model call failed");
}

function parseJson(raw: string): any {
  let jsonText = raw.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    const m = jsonText.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return JSON");
    return JSON.parse(m[0]);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const {
      subtopicKey, year, subject, subtopicName, questions,
      batchIndex, batchSize, regenerate, saveContent, content,
    } = parsed.data;

    // ---------- Mode 2: SAVE merged ----------
    if (saveContent === true) {
      if (!content || typeof content !== "object") {
        return new Response(JSON.stringify({ error: "content required to save" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("handwritten_notes").upsert({
        subtopic_key: subtopicKey,
        year, subject, subtopic_name: subtopicName,
        content,
        updated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ saved: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Mode 1: batch generation ----------
    const size = batchSize ?? DEFAULT_BATCH_SIZE;
    const totalBatches = Math.max(1, Math.ceil(questions.length / size));
    const idx = batchIndex ?? 0;

    // Cache hit on first batch (unless regenerate)
    if (idx === 0 && !regenerate) {
      const { data: cached } = await admin
        .from("handwritten_notes")
        .select("content")
        .eq("subtopic_key", subtopicKey)
        .maybeSingle();
      if (cached?.content) {
        return new Response(JSON.stringify({
          cached: true,
          content: cached.content,
          batchIndex: 0,
          totalBatches: 1,
          hasMore: false,
          estSecondsPerBatch: EST_SECONDS_PER_BATCH,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (idx >= totalBatches) {
      return new Response(JSON.stringify({ error: `batchIndex ${idx} out of range (total ${totalBatches})` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batch = questions.slice(idx * size, idx * size + size);
    const essayList = batch.map((q, i) => `${i + 1}. ${q}`).join("\n");
    const userPrompt = `SUBJECT: ${subject}
YEAR: ${year}
SUBTOPIC: ${subtopicName}
${totalBatches > 1 ? `\nBATCH ${idx + 1} of ${totalBatches} — produce sections covering ONLY these questions:` : "\nPREVIOUS YEAR ESSAY & SHORT-NOTE QUESTIONS:"}
${essayList}

Generate the handwritten-style study page JSON now. Ensure every listed question is answered inside the sections.`;

    const raw = await callModel(userPrompt);
    const batchContent = parseJson(raw);
    if (!batchContent || !Array.isArray(batchContent.sections)) {
      throw new Error("Model returned invalid structure");
    }

    const hasMore = idx + 1 < totalBatches;
    return new Response(JSON.stringify({
      cached: false,
      content: batchContent,
      batchIndex: idx,
      totalBatches,
      hasMore,
      estSecondsPerBatch: EST_SECONDS_PER_BATCH,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    console.error("generate-handwritten-notes error:", err);
    const isQuota = /429/.test(msg) || /quota/i.test(msg) || /rate/i.test(msg);
    const isCredits = /402/.test(msg);
    return new Response(
      JSON.stringify({
        error: isCredits
          ? "AI service credits exhausted. Please add credits or try again later."
          : isQuota
            ? "AI service is temporarily busy. Please wait ~30 seconds and retry."
            : msg,
      }),
      { status: isQuota ? 429 : isCredits ? 402 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
