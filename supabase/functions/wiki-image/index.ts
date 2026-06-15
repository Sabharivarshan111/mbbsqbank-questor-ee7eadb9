import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "ORBIT-MBBS-QBANK/1.0 (medical-education)";

const requestSchema = z.object({
  terms: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
});

interface ImageResult {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
}

// In-memory rate-limit per IP (10/min)
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

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

// Step 1: Wikipedia search — also corrects spelling via "srinfo=suggestion".
async function wikiSearchTitle(term: string): Promise<string | null> {
  const t = withTimeout(5000);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      term
    )}&srlimit=1&srinfo=suggestion&srprop=&format=json&origin=*`;
    const res = await fetch(url, { signal: t.signal, headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const json: any = await res.json();
    const hit = json?.query?.search?.[0]?.title;
    if (hit) return hit;
    const suggestion = json?.query?.searchinfo?.suggestion;
    if (suggestion) {
      // Retry once with suggested spelling
      const r2 = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          suggestion
        )}&srlimit=1&srprop=&format=json&origin=*`,
        { headers: { "User-Agent": UA } }
      );
      if (r2.ok) {
        const j2: any = await r2.json();
        return j2?.query?.search?.[0]?.title || null;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Step 2: page summary → thumbnail
async function wikiSummary(title: string, originalTerm: string): Promise<ImageResult | null> {
  const t = withTimeout(5000);
  try {
    const enc = encodeURIComponent(title.replace(/\s+/g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${enc}?redirect=true`,
      { signal: t.signal, headers: { "User-Agent": UA } }
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const thumb = json?.thumbnail?.source || json?.originalimage?.source;
    if (!thumb) return null;
    return {
      term: originalTerm,
      imageUrl: thumb,
      caption: json?.description || json?.extract?.slice(0, 140),
      sourceUrl: json?.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Step 3: Wikimedia Commons file search
async function commonsSearch(term: string): Promise<ImageResult | null> {
  const t = withTimeout(5000);
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      term
    )}&gsrlimit=1&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600&format=json&origin=*`;
    const res = await fetch(url, { signal: t.signal, headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const json: any = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return null;
    const first: any = Object.values(pages)[0];
    const info = first?.imageinfo?.[0];
    const src = info?.thumburl || info?.url;
    if (!src) return null;
    return {
      term,
      imageUrl: src,
      caption: info?.extmetadata?.ImageDescription?.value
        ?.replace(/<[^>]+>/g, "")
        ?.slice(0, 140) || first?.title?.replace(/^File:/, ""),
      sourceUrl: info?.descriptionurl,
    };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Step 4: Openverse (CC-licensed) image search
async function openverseSearch(term: string): Promise<ImageResult | null> {
  const t = withTimeout(5000);
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
      term
    )}&page_size=1&license_type=all`;
    const res = await fetch(url, {
      signal: t.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const first = json?.results?.[0];
    const src = first?.thumbnail || first?.url;
    if (!src) return null;
    return {
      term,
      imageUrl: src,
      caption: first?.title?.slice(0, 140),
      sourceUrl: first?.foreign_landing_url || first?.url,
    };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

async function lookupTerm(term: string): Promise<ImageResult | null> {
  // 1+2. Search Wikipedia (auto-corrects spelling), then fetch summary thumb.
  const title = await wikiSearchTitle(term);
  if (title) {
    const r = await wikiSummary(title, term);
    if (r) return r;
  }
  // 3. Wikimedia Commons direct image search.
  const c = await commonsSearch(term);
  if (c) return c;
  // 4. Openverse fallback.
  const o = await openverseSearch(term);
  if (o) return o;
  return null;
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

    const results = await Promise.all(parsed.data.terms.map(lookupTerm));
    const images = results.filter((r): r is ImageResult => !!r);

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
