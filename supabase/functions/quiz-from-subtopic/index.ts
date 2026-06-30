import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const Body = z.object({
  subject: z.string().min(1).max(120),
  questions: z.array(z.string().min(1).max(800)).min(3).max(40),
});

interface Mcq { question: string; options: string[]; correctIndex: number; explanation: string; }

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeErrorMessage = (status: number, text: string) => {
  try {
    const parsed = JSON.parse(text);
    const message = parsed?.message || parsed?.error?.message || parsed?.error || "";
    if (status === 402) return "AI quiz needs Lovable credits. Please add credits to generate quizzes.";
    if (status === 429) return "AI quiz is rate-limited right now. Please try again in a minute.";
    return message ? String(message).slice(0, 220) : `AI service error (${status}).`;
  } catch {
    if (status === 402) return "AI quiz needs Lovable credits. Please add credits to generate quizzes.";
    if (status === 429) return "AI quiz is rate-limited right now. Please try again in a minute.";
    return text?.slice(0, 220) || `AI service error (${status}).`;
  }
};

const stripJsonFence = (value: string) => {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
};

const isValidMcq = (item: unknown): item is Mcq => {
  const mcq = item as Mcq;
  return Boolean(
    mcq &&
    typeof mcq.question === "string" &&
    Array.isArray(mcq.options) &&
    mcq.options.length === 4 &&
    mcq.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    Number.isInteger(mcq.correctIndex) &&
    mcq.correctIndex >= 0 &&
    mcq.correctIndex <= 3 &&
    typeof mcq.explanation === "string",
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    console.error("quiz-from-subtopic: missing LOVABLE_API_KEY");
    return json({ error: "AI quiz is not configured yet." }, 500);
  }

  let parsed;
  try { parsed = Body.safeParse(await req.json()); }
  catch { return json({ error: "Invalid quiz request." }, 400); }
  if (!parsed.success) {
    return json({ error: "Select at least 3 studied questions before starting a quiz." }, 400);
  }

  const { subject, questions } = parsed.data;
  console.log(`quiz-from-subtopic: generating quiz`, { subject, questionCount: questions.length });
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
- Return JSON only — no prose, no markdown fence.

Required JSON shape:
{"mcqs":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "raw-fetch" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiRes.ok) {
    const txt = await aiRes.text();
    const message = safeErrorMessage(aiRes.status, txt);
    console.error(`quiz-from-subtopic: gateway failed`, { status: aiRes.status, message });
    return json({ error: message }, aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502);
  }

  const data = await aiRes.json();
  const content = data?.choices?.[0]?.message?.content;
  let mcqs: Mcq[] = [];
  try {
    const obj = typeof content === "string" ? JSON.parse(stripJsonFence(content)) : content;
    mcqs = (obj?.mcqs ?? []).filter(isValidMcq).slice(0, 5);
  } catch {
    console.error("quiz-from-subtopic: could not parse AI response");
    return json({ error: "AI returned an unreadable quiz. Please try again." }, 502);
  }

  if (mcqs.length === 0) {
    console.error("quiz-from-subtopic: no valid MCQs returned");
    return json({ error: "AI did not return valid MCQs. Please try again." }, 502);
  }

  return json({ mcqs });
});
