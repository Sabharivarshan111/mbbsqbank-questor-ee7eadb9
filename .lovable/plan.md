# Fix Handwritten Notes generation (Gemini-only)

## Why it's failing now
The edge function makes **one giant Gemini call** with all questions in a subtopic. Two problems:
1. **Free-tier quota (20 req/day)** — logs show repeated `Gemini 429 ... limit: 20`. Not caused by too many calls per note, but by many notes generated across the day.
2. **Output token limit (~6000)** — big subtopics (Medicine, OBG) return truncated JSON, so the UI shows garbled/empty content.

Your idea (split into 10+10) directly fixes #2 and improves reliability. We'll keep using **your existing `GEMINI_API_KEY`** — no Lovable AI Gateway.

## Plan

### 1. Chunked generation in `supabase/functions/generate-handwritten-notes/index.ts`
- If `questions.length <= 10` → single Gemini call (same as today, 1 request).
- If `questions.length > 10` → split into batches of **10** and process **sequentially** (not parallel) with a **1.2s delay between calls** to respect Gemini's per-minute rate limit.
- Each batch gets a slightly adjusted prompt: "This is batch X of Y for subtopic Z — produce sections for THESE questions only."
- **Merge results** after all batches finish:
  - `highYieldTip` → keep first non-empty, append others as extra bullets
  - `pyqYears` → union + dedupe + sort
  - `sections` → concat, then dedupe by lowercased `title` (merge payload items when titles collide)

### 2. Robust Gemini call
- Retry on `429`/`503` with exponential backoff: 2s → 5s → 12s (max 3 attempts per batch).
- On final failure of a batch, **don't fail the whole note** — return partial notes with a `warnings: [...]` field the UI can show ("2 of 4 batches failed, showing partial notes — click Regenerate later").

### 3. Better error messages in `HandwrittenNotesHub.tsx`
- Extract real error from `FunctionsHttpError` (currently shows generic "non-2xx").
- If Gemini quota hit → show: "Daily Gemini quota reached (20/day free tier). Try again tomorrow or upgrade your Gemini plan."
- Render `warnings` from partial results.

### 4. Cache unchanged
The `handwritten_notes` Supabase table already caches per subtopic, so users don't burn quota re-opening the same note.

## Quota reality check (important)
Chunking **increases** requests per note (a 40-question subtopic = 4 requests instead of 1), so the 20/day free cap will be hit **faster**, not slower. But without chunking, big subtopics silently produce broken output. Two ways forward with Gemini-only:
- **A) Accept fewer notes/day** on free tier (recommended for now — fixes quality).
- **B) Upgrade your Gemini API key to a paid tier** (1000+ req/day) — no code change needed, just billing on Google AI Studio.

I'll implement chunking + retries + partial results. You decide on the quota upgrade separately.
