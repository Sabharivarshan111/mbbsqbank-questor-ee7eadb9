import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Stage A: Tag diagrammatic questions.
 * Accepts a batch of questions from the client, asks Gemini to classify each one,
 * and upserts rows into public.question_diagrams.
 */

const ItemSchema = z.object({
  year: z.string().min(1).max(40),
  subject: z.string().min(1).max(120),
  subtopic_key: z.string().min(1).max(200),
  question_type: z.enum(["essay", "short-note"]),
  question_text: z.string().min(1).max(2000),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1).max(50),
  geminiApiKey: z.string().min(1).max(255),
});

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_TIMEOUT_MS = 55_000;

const SYSTEM_PROMPT = `You are an expert MBBS exam analyst. Given a list of previous-year MBBS questions, decide which ones need a visual answer (diagram, flowchart, algorithm, table, lifecycle, morphology plate, anatomy drawing, etc.).

For each question, return a JSON object with these exact fields:
- "is_diagrammatic": boolean
- "diagram_kind": one of "flowchart", "table", "histology_plate", "anatomy", "lifecycle", "algorithm", "comparison", "other"
- "needs_ai_raster": boolean (true only for realistic histology plates, gross specimens, clinical photos, ECG strips, anatomy illustrations that cannot be drawn as code/SVG)
- "render_prompt": a detailed prompt that can be used to generate the visual. Include the exact labels, arrows, boxes, and any numbers/drugs/doses that must appear. Keep it under 400 words.

Rules:
- "Draw a labeled diagram" → always diagrammatic, usually anatomy or flowchart.
- "Classify" / "Compare" / "Differences between" → diagrammatic, usually table or comparison.
- "Mechanism" / "pathogenesis" / "cycle" / "life cycle" / "flow of events" → diagrammatic, usually flowchart or lifecycle.
- "Morphology" / "histology" / "gross" → diagrammatic, often needs_ai_raster true.
- Pure "Define" or "List adverse effects" without any visual requirement → is_diagrammatic false.
- Output MUST be a valid JSON array only, no markdown fences, no prose. Each array element corresponds to the input question in the same order.`;

function getQuestionId(text: string): string {
  return `question-${text.slice(0, 50).replace(/\s+/g, "-")}`;
}

class UpstreamError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<any[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new UpstreamError(504, "Gemini request timed out");
    }
    throw new UpstreamError(502, (err as Error).message);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new UpstreamError(res.status, `Gemini error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(raw);
  } catch {
    throw new UpstreamError(500, `Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

function buildPrompt(items: z.infer<typeof ItemSchema>[]): string {
  const lines = items.map((it, i) => {
    const tag = it.question_type === "essay" ? "[ESSAY]" : "[SHORT NOTE]";
    return `${i + 1}. ${tag} ${it.question_text}`;
  });
  return `Analyze these ${items.length} MBBS questions and return a JSON array of classification objects in the same order.\n\n${lines.join("\n")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { items, geminiApiKey } = parsed.data;

  try {
    const classifications = await callGemini(geminiApiKey, buildPrompt(items));
    if (!Array.isArray(classifications) || classifications.length !== items.length) {
      return new Response(JSON.stringify({ error: "Gemini returned wrong number of classifications" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upserts = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cls = classifications[i] ?? {};
      const qid = getQuestionId(item.question_text);
      const isDiagrammatic = cls.is_diagrammatic === true;
      upserts.push({
        question_id: qid,
        year: item.year,
        subject: item.subject,
        subtopic_key: item.subtopic_key,
        question_text: item.question_text,
        question_type: item.question_type,
        diagram_kind: cls.diagram_kind ?? "other",
        needs_ai_raster: cls.needs_ai_raster === true,
        render_prompt: isDiagrammatic ? (cls.render_prompt ?? "") : "",
        status: isDiagrammatic ? "prompt_ready" : "pending",
      });
    }

    const { error } = await supabase.from("question_diagrams").upsert(upserts, {
      onConflict: "question_id",
      ignoreDuplicates: false,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ processed: upserts.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = (err as UpstreamError).status ?? 500;
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
