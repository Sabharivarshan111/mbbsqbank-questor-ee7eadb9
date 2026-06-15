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

type Source = "wikipedia" | "commons" | "openverse";

interface ImageResult {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
  source: Source;
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

// Wikipedia search (with spelling correction). Returns best matching title.
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
      source: "wikipedia",
    };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Wikimedia Commons — fetch multiple distinct files.
async function commonsSearch(term: string, limit = 2): Promise<ImageResult[]> {
  const t = withTimeout(5000);
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      term
    )}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600&format=json&origin=*`;
    const res = await fetch(url, { signal: t.signal, headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const json: any = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return [];
    const out: ImageResult[] = [];
    for (const p of Object.values(pages) as any[]) {
      const info = p?.imageinfo?.[0];
      const src = info?.thumburl || info?.url;
      if (!src) continue;
      // Skip non-image media (svg ok, but skip pdf/ogv/webm/tif)
      if (/\.(pdf|ogv|webm|ogg|mp3|tif|tiff)$/i.test(src)) continue;
      out.push({
        term,
        imageUrl: src,
        caption:
          info?.extmetadata?.ImageDescription?.value
            ?.replace(/<[^>]+>/g, "")
            ?.slice(0, 140) || p?.title?.replace(/^File:/, ""),
        sourceUrl: info?.descriptionurl,
        source: "commons",
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    t.done();
  }
}

async function openverseSearch(term: string, limit = 2): Promise<ImageResult[]> {
  const t = withTimeout(5000);
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
      term
    )}&page_size=${limit}&license_type=all`;
    const res = await fetch(url, {
      signal: t.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    const results = json?.results || [];
    return results
      .map((r: any): ImageResult | null => {
        const src = r?.thumbnail || r?.url;
        if (!src) return null;
        return {
          term,
          imageUrl: src,
          caption: r?.title?.slice(0, 140),
          sourceUrl: r?.foreign_landing_url || r?.url,
          source: "openverse",
        };
      })
      .filter((x: any): x is ImageResult => !!x);
  } catch {
    return [];
  } finally {
    t.done();
  }
}

// Fetch images in parallel from all sources, deduped by URL, target >=3.
async function lookupTerm(term: string): Promise<ImageResult[]> {
  const titlePromise = wikiSearchTitle(term);
  const [title, commons, openverse] = await Promise.all([
    titlePromise,
    commonsSearch(term, 2),
    openverseSearch(term, 2),
  ]);
  const wiki = title ? await wikiSummary(title, term) : null;

  const ordered: ImageResult[] = [];
  if (wiki) ordered.push(wiki);
  if (commons[0]) ordered.push(commons[0]);
  if (openverse[0]) ordered.push(openverse[0]);
  // Top-ups to reach at least 3 when one source missing
  if (commons[1]) ordered.push(commons[1]);
  if (openverse[1]) ordered.push(openverse[1]);

  // Dedupe by imageUrl
  const seen = new Set<string>();
  const out: ImageResult[] = [];
  for (const img of ordered) {
    if (seen.has(img.imageUrl)) continue;
    seen.add(img.imageUrl);
    out.push(img);
    if (out.length >= 4) break;
  }
  return out;
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
    const images = results.flat();

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
