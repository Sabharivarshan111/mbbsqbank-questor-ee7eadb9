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
  questions: z.array(z.string().max(1000)).min(1).max(80),
  regenerate: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are an expert MBBS professor generating exam-ready HANDWRITTEN-STYLE study notes.
Given a SUBTOPIC and its previous-year essay + short-note questions, synthesise ONE unified study page.

Output MUST be VALID JSON only (no markdown fence, no prose) matching this exact schema:

{
  "highYieldTip": string,               // 1-3 sentences, the single most examinable pearl
  "pyqYears": string[],                 // best-effort likely PYQ years mentioned in questions, else []
  "sections": [                          // 4-10 sections, ordered pedagogically
    {
      "type": "definition" | "bullets" | "steps" | "morphology" | "comparison" | "table" | "outcome" | "text",
      "title": string,                  // e.g. "Etiology", "Pathogenesis", "Morphology"
      "icon": string,                   // one emoji: 📌 ⚠️ 🔬 ⚖️ 📊 🧪 💊 🧬 🩺 🏥 🧠 ❤️ 🫁
      "pyqYears": string[]?,            // optional PYQ years relevant to THIS section
      "payload": object                 // shape depends on type (see below)
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
- Keep language crisp, exam-ready. Use bold-worthy terminology in the text (do NOT add markdown asterisks, we render bold via structure).
- Group PYQ years above the sections they relate to when derivable from the question text.
- Response MUST be JSON only, starting with { and ending with }.`;

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
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { subtopicKey, year, subject, subtopicName, questions, regenerate } = parsed.data;

    // 1. Check cache
    if (!regenerate) {
      const { data: cached } = await admin
        .from("handwritten_notes")
        .select("content, updated_at")
        .eq("subtopic_key", subtopicKey)
        .maybeSingle();
      if (cached?.content) {
        return new Response(
          JSON.stringify({ cached: true, content: cached.content }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Build prompt
    const essayList = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    const userPrompt = `SUBJECT: ${subject}
YEAR: ${year}
SUBTOPIC: ${subtopicName}

PREVIOUS YEAR ESSAY & SHORT-NOTE QUESTIONS:
${essayList}

Generate the handwritten-style study page JSON now. Ensure every listed question is answered inside the sections.`;

    // 3. Call Gemini with 1 retry
    let raw = "";
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        raw = await callGemini(geminiKey, userPrompt);
        break;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    if (!raw) throw lastErr ?? new Error("Gemini call failed");

    // 4. Parse JSON (strip any accidental fencing)
    let jsonText = raw.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
    }
    let content: any;
    try {
      content = JSON.parse(jsonText);
    } catch {
      // best-effort: extract first {...}
      const m = jsonText.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Model did not return JSON");
      content = JSON.parse(m[0]);
    }

    if (!content || !Array.isArray(content.sections)) {
      throw new Error("Invalid notes structure from model");
    }

    // 5. Upsert into cache
    await admin.from("handwritten_notes").upsert({
      subtopic_key: subtopicKey,
      year,
      subject,
      subtopic_name: subtopicName,
      content,
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ cached: false, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-handwritten-notes error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
