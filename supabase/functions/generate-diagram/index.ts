import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  context: z.string().trim().min(1).max(4000),
  kind: z.enum(["flowchart", "mindmap", "diagram"]).default("diagram"),
});

const rateMap = new Map<string, number[]>();
const RL_WINDOW = 60_000;
const RL_MAX = 5;
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateMap.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  if (arr.length >= RL_MAX) return true;
  arr.push(now);
  rateMap.set(ip, arr);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  try {
    const ip = req.headers.get("x-forwarded-for") || "anon";
    if (rateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Try again in a minute." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    const { context, kind } = parsed.data;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "Image generation not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const prompt = `Create a clean, presentable medical ${kind} illustrating the following concept. Use clearly labeled boxes/branches connected with arrows, high contrast, neutral background, large readable text, no decorative clutter. Concept:\n\n${context}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-1-mini",
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("generate-diagram upstream error", res.status, text);
      return new Response(
        JSON.stringify({ error: "Could not generate diagram" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }
    const json: any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(
        JSON.stringify({ error: "No image returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl: `data:image/png;base64,${b64}`, kind }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("generate-diagram error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
