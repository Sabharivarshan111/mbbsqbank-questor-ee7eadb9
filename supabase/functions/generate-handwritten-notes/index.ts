import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  subtopicKey: z.string().min(1).max(300),
  year: z.string().min(1).max(40),
  subject: z.string().min(1).max(120),
  subtopicName: z.string().min(1).max(200),
  questions: z.array(z.string().max(1000)).min(1).max(200),
  regenerate: z.boolean().optional(),
});

const BATCH_SIZE = 10;
const INTER_BATCH_DELAY_MS = 1200;

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

class GeminiError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

async function callGemini(apiKey: string, userPrompt: string): Promise<string> {
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
        maxOutputTokens: 6000,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new GeminiError(res.status, `Gemini ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) throw new GeminiError(500, "Empty response from Gemini");
  return text;
}

async function callGeminiWithRetry(apiKey: string, prompt: string): Promise<string> {
  const delays = [2000, 5000, 12000];
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      return await callGemini(apiKey, prompt);
    } catch (e) {
      lastErr = e;
      const status = e instanceof GeminiError ? e.status : 0;
      // only retry on transient
      if (status !== 429 && status !== 503 && status !== 500 && status !== 502 && status !== 504) {
        throw e;
      }
      if (attempt < delays.length - 1) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastErr ?? new Error("Gemini call failed");
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

function mergeNotes(parts: any[]): any {
  const merged: any = { highYieldTip: "", pyqYears: [], sections: [] };
  const extraTips: string[] = [];
  const yearSet = new Set<string>();
  const sectionsByTitle = new Map<string, any>();

  for (const p of parts) {
    if (!p) continue;
    if (p.highYieldTip) {
      if (!merged.highYieldTip) merged.highYieldTip = p.highYieldTip;
      else extraTips.push(p.highYieldTip);
    }
    if (Array.isArray(p.pyqYears)) p.pyqYears.forEach((y: string) => y && yearSet.add(String(y)));
    if (Array.isArray(p.sections)) {
      for (const s of p.sections) {
        const key = (s?.title ?? "").toLowerCase().trim();
        if (!key) { merged.sections.push(s); continue; }
        const existing = sectionsByTitle.get(key);
        if (!existing) {
          sectionsByTitle.set(key, s);
          merged.sections.push(s);
        } else {
          // merge items where applicable
          if (existing.payload?.items && s.payload?.items && Array.isArray(existing.payload.items)) {
            existing.payload.items = [...existing.payload.items, ...s.payload.items];
          }
          if (Array.isArray(existing.pyqYears) && Array.isArray(s.pyqYears)) {
            existing.pyqYears = Array.from(new Set([...existing.pyqYears, ...s.pyqYears]));
          }
        }
      }
    }
  }
  if (extraTips.length) merged.highYieldTip += " " + extraTips.join(" ");
  merged.pyqYears = Array.from(yearSet).sort();
  return merged;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { subtopicKey, year, subject, subtopicName, questions, regenerate } = parsed.data;

    // 1. Cache
    if (!regenerate) {
      const { data: cached } = await admin
        .from("handwritten_notes")
        .select("content, updated_at")
        .eq("subtopic_key", subtopicKey)
        .maybeSingle();
      if (cached?.content) {
        return new Response(JSON.stringify({ cached: true, content: cached.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Chunk & call Gemini sequentially
    const batches = questions.length <= BATCH_SIZE ? [questions] : chunk(questions, BATCH_SIZE);
    const results: any[] = [];
    const warnings: string[] = [];
    let firstFatalError: Error | null = null;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const essayList = batch.map((q, idx) => `${idx + 1}. ${q}`).join("\n");
      const userPrompt = `SUBJECT: ${subject}
YEAR: ${year}
SUBTOPIC: ${subtopicName}
${batches.length > 1 ? `\nBATCH ${i + 1} of ${batches.length} — produce sections covering ONLY these questions:` : "\nPREVIOUS YEAR ESSAY & SHORT-NOTE QUESTIONS:"}
${essayList}

Generate the handwritten-style study page JSON now. Ensure every listed question is answered inside the sections.`;

      try {
        const raw = await callGeminiWithRetry(geminiKey, userPrompt);
        const parsedBatch = parseJson(raw);
        if (parsedBatch && Array.isArray(parsedBatch.sections)) {
          results.push(parsedBatch);
        } else {
          warnings.push(`Batch ${i + 1}: invalid structure returned`);
        }
      } catch (e) {
        const msg = (e as Error).message ?? "unknown";
        const status = e instanceof GeminiError ? e.status : 0;
        warnings.push(`Batch ${i + 1} failed${status ? ` (${status})` : ""}: ${msg.slice(0, 200)}`);
        // If it's a hard quota failure and we have no results yet, treat as fatal
        if (results.length === 0 && i === batches.length - 1) {
          firstFatalError = e as Error;
        }
      }

      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }

    if (results.length === 0) {
      throw firstFatalError ?? new Error(warnings[0] ?? "All batches failed");
    }

    const content = results.length === 1 ? results[0] : mergeNotes(results);
    if (warnings.length) content.warnings = warnings;

    // 3. Cache (only if fully successful, so retry can succeed later)
    if (warnings.length === 0) {
      await admin.from("handwritten_notes").upsert({
        subtopic_key: subtopicKey,
        year,
        subject,
        subtopic_name: subtopicName,
        content,
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ cached: false, content, partial: warnings.length > 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    console.error("generate-handwritten-notes error:", err);
    const isQuota = /429/.test(msg) || /quota/i.test(msg);
    return new Response(
      JSON.stringify({
        error: isQuota
          ? "Daily Gemini quota reached (20/day free tier). Try again tomorrow or upgrade your Gemini plan."
          : msg,
      }),
      { status: isQuota ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
