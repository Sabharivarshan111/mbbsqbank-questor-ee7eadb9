import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const Body = z.object({
  subject: z.string().min(1).max(120),
  questions: z.array(z.string().min(1).max(800)).min(3).max(40),
});

interface Mcq { question: string; options: string[]; correctIndex: number; explanation: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed;
  try { parsed = Body.safeParse(await req.json()); }
  catch { return new Response(JSON.stringify({ error: "invalid body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { subject, questions } = parsed.data;
  const sample = questions.slice(0, 12).map((q, i) => `${i + 1}. ${q}`).join("\n");
  const prompt = `You are an MBBS examiner. Create EXACTLY 5 high-quality MCQs for an undergraduate medical student studying "${subject}".
Base them on these study questions the student has already revised:
${sample}

Rules:
- Each MCQ must have exactly 4 options (A,B,C,D).
- Only ONE correct option.
- "correctIndex" is 0-based (0=A, 1=B, 2=C, 3=D).
- Add a short, evidence-based explanation (1-2 sentences).
- Cover different concepts from the list.
- Return JSON only — no prose, no markdown fence.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "raw-fetch" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mcq_set",
          schema: {
            type: "object",
            properties: {
              mcqs: {
                type: "array", minItems: 5, maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                    explanation: { type: "string" },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["mcqs"], additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!aiRes.ok) {
    const txt = await aiRes.text();
    return new Response(JSON.stringify({ error: `AI ${aiRes.status}: ${txt.slice(0, 200)}` }), {
      status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await aiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  let mcqs: Mcq[] = [];
  try {
    const obj = typeof content === "string" ? JSON.parse(content) : content;
    mcqs = obj?.mcqs ?? [];
  } catch {
    return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ mcqs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
