import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FALLBACK = [
  "Dr. Scalpel", "Dr. Synapse", "Cardio Kid", "Dr. Nephron",
  "Neuro Ninja", "Dr. Alveoli", "Pharma Pro", "Dr. Mitochondria",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const seed = typeof body.seed === "string" ? body.seed.slice(0, 60) : "";
    const year = typeof body.year === "string" ? body.year.slice(0, 20) : "";

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ names: FALLBACK.slice(0, 6) });

    const prompt =
      `Suggest 6 short, fun, clean medical-student nicknames for an MBBS ${year || ""} student` +
      (seed ? ` whose name/hint is "${seed}"` : "") +
      `. Max 18 characters each, no numbers, no offensive words, no explanations. ` +
      `Reply with ONLY a JSON array of 6 strings.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.1, maxOutputTokens: 200 },
        }),
      },
    );
    if (!res.ok) {
      console.error("gemini nickname failed", res.status, await res.text());
      return json({ names: FALLBACK.slice(0, 6) });
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
    let names: string[] = [];
    try {
      const m = text.match(/\[[\s\S]*\]/);
      if (m) names = JSON.parse(m[0]);
    } catch { /* ignore */ }
    names = (Array.isArray(names) ? names : [])
      .filter((n) => typeof n === "string")
      .map((n) => n.trim().slice(0, 18))
      .filter((n) => n.length >= 2)
      .slice(0, 6);
    if (!names.length) names = FALLBACK.slice(0, 6);
    return json({ names });
  } catch (err) {
    console.error("nickname-suggest failure", err);
    return json({ names: FALLBACK.slice(0, 6) });
  }
});
