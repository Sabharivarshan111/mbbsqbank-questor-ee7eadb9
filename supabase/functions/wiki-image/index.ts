import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  terms: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
});

interface ImageResult {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
}

// Simple in-memory rate-limit per IP (10/min)
const rateMap = new Map<string, number[]>();
const RL_WINDOW = 60_000;
const RL_MAX = 10;
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateMap.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  if (arr.length >= RL_MAX) return true;
  arr.push(now);
  rateMap.set(ip, arr);
  return false;
}

async function fetchWiki(term: string): Promise<ImageResult | null> {
  const enc = encodeURIComponent(term.replace(/\s+/g, "_"));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${enc}?redirect=true`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "ORBIT-MBBS-QBANK/1.0 (medical-education)" },
      }
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const thumb = json?.thumbnail?.source || json?.originalimage?.source;
    if (!thumb) return null;
    return {
      term,
      imageUrl: thumb,
      caption: json?.description || json?.extract?.slice(0, 140),
      sourceUrl: json?.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  try {
    const ip = req.headers.get("x-forwarded-for") || "anon";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const results = await Promise.all(parsed.data.terms.map(fetchWiki));
    const images = results.filter((r): r is ImageResult => r !== null);
    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("wiki-image error", e);
    return new Response(JSON.stringify({ images: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
