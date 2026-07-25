
## Root cause

The textbooks are present in `supabase/functions/generate-handwritten-notes/textbooks/` (sia_1.txt, sia_2.txt, vision.txt) and `textbook.ts` tries to read them via `Deno.readTextFile(new URL('./textbooks/...', import.meta.url))`.

But Supabase Edge Functions only bundle files that are **imported** by TypeScript. Sibling `.txt` files are NOT deployed unless declared under `[functions.<name>] static_files` in `supabase/config.toml`. Our `config.toml` currently has only `project_id` — nothing else.

Result: at runtime `Deno.readTextFile` throws, `readBundled` catches it and returns `""`, `buildTextbookContext` returns `""`, and Gemini generates purely from its own memory. That is exactly why you don't see anything from the Sia / Vision books in the notes.

A second issue: the prompt treats every question the same, so short-notes get essay-length blocks and essays sometimes get thin ones.

## Fix

### 1. Actually ship the textbooks with the function
Convert the OCR files into TypeScript string modules so they are bundled deterministically (no `config.toml` static-file guesswork, no cold-start file I/O):

```
supabase/functions/generate-handwritten-notes/textbooks/
  sia_1.text.ts    → export default "<full OCR string>"
  sia_2.text.ts    → export default "..."
  vision.text.ts   → export default "..."
```

Rewrite `textbook.ts` to `import` these strings directly instead of `Deno.readTextFile`. Delete the `.txt` files after conversion (they were dead weight anyway).

### 2. Re-ingest the fresh uploads
Use the newly uploaded `Sia_spm_merged.txt` and `Vision_4th_Edition-3.txt` from `/mnt/user-uploads/` as the source for the three string modules (split Sia in half so each chunk stays under Deno's module-size sweet spot).

### 3. Add a runtime log line
On first hit per cold start, log `textbook: sia paragraphs=<n>, vision paragraphs=<n>` and, per request, log `context chars for <subtopic> = <n>`. This makes it trivial to confirm grounding is live from the edge-function logs — no more silent fallbacks.

### 4. Prompt: classify each question, then size the answer
In `index.ts`, when building `essayList`, detect per-question type by regex on the question text:
- **Short note** if it starts with / contains "short note", "write short notes on", "brief note", "short account".
- **Essay** if it contains "define ... and describe", "discuss", "classify", "explain in detail", "write an essay", or is long (>90 chars) with multiple sub-parts (a/b/c or numbered).
- Otherwise **standard**.

Pass a per-question tag to the model and update the system prompt with explicit depth targets:
- **essay** → definition + classification + full pathogenesis/clinical/management + complications + high-yield table where feasible; aim ~10–14 sections' worth of content across the batch.
- **short note** → 4–6 crisp bullets or a small table, no long paragraphs.
- **standard** → 6–8 bullets.

Also tell it: "If the textbook reference contains an answer, prefer its facts, numbers, schedules and classifications verbatim. Definitions must stay canonical — do not paraphrase textbook definitions. Modify only surrounding explanation, mnemonics, and structure."

### 5. Grow the grounding budget
- Raise `maxChars` from 12000 → 18000 for batch generation and from 8000 → 12000 for AI edits.
- Raise the paragraph cap from 40 → 80 and add a second-pass score that boosts paragraphs containing any question's first three medically-meaningful tokens (so we don't lose relevant text when many questions share generic words).

### 6. No other behavior changes
- Still `gemini-3.1-flash-lite` via direct `GEMINI_API_KEY` — no Lovable AI Gateway.
- 25 s inter-batch delay, batch size 10, "regenerate failed sections" flow: unchanged.
- Client UI unchanged.

## Files touched

- `supabase/functions/generate-handwritten-notes/textbooks/sia_1.text.ts` (new)
- `supabase/functions/generate-handwritten-notes/textbooks/sia_2.text.ts` (new)
- `supabase/functions/generate-handwritten-notes/textbooks/vision.text.ts` (new)
- Delete `textbooks/sia_1.txt`, `sia_2.txt`, `vision.txt`
- `supabase/functions/generate-handwritten-notes/textbook.ts` — import strings, remove `Deno.readTextFile`, bigger budget, logging
- `supabase/functions/generate-handwritten-notes/index.ts` — per-question typing, updated system-prompt depth rules, logging

## Verification

1. Deploy function, open logs, generate notes for **Community Medicine → Epidemiology of Communicable Diseases → Typhoid** and confirm log line `textbook context chars = <large number>` and that output contains Sia-specific phrasing (e.g. exact incubation-period ranges, national-programme names).
2. Same for **Forensic Medicine → Legal Procedures → Inquest** against Vision (e.g. "4 U's — Unnatural, Unexpected, Unexplained, Unclaimed", Section 174 CrPC / Cl 194 BNSS).
3. Confirm a short-note question produces ≤6 bullets while an essay question produces multi-section deep output in the same batch.
