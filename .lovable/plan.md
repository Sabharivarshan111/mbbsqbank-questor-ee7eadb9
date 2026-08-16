# Detailed Pipeline: Diagram / Flowchart / Visualization Generation for Diagrammatic Questions

## Goal
Automatically identify MBBS questions that need a visual answer, generate the correct visual (flowchart, algorithm, histology plate, anatomy diagram, lifecycle, etc.), compress it, store it in Supabase, and show it inline inside the question/notes UI.

## 1. Question Discovery & Exact Counts

Run a one-time tagging pass over the existing `QUESTION_BANK_DATA` (essay + short-note questions).

**Diagram-worthiness signals:**
- Keywords: "diagram", "flowchart", "draw", "sketch", "chart", "cycle", "pathway", "mechanism", "life cycle", "morphology", "histology", "gross", "algorithm", "classify" (when a tree/table is expected), "stages", "features".
- Explicit "Draw a labeled diagram of..." / "Describe with a flowchart".
- Implicit: disease cycles (malaria, filaria), demographic cycles, IMNCI algorithms, TB/HIV care pathways, neoplasm staging, embryology diagrams, ECG strips, histology plates.

**Estimated counts (from the previous scan):**

| Year | Essay candidates | Short-note candidates | Total ~ |
|------|------------------|-----------------------|---------|
| 1st Year (Anatomy, Physio, Biochem) | ~55 | ~101 | ~156 |
| 2nd Year (Pathology, Pharmacology, Microbiology) | ~82 | ~146 | ~228 |
| 3rd Year (FM, SPM) | ~18 | ~26 | ~44 |
| Final Year (Clinical subjects) | ~51 | ~92 | ~143 |
| **Total** | **~206** | **~365** | **~571** |

> These are estimates. Stage A will produce the exact list.

## 2. Stage A — Tagging & Prompt Engineering Table

Create a new Supabase table `question_diagrams`:

```sql
CREATE TABLE public.question_diagrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL,          -- stable hash of the question text
  year text NOT NULL,
  subject text NOT NULL,
  subtopic_key text NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,         -- essay | short-note
  diagram_kind text NOT NULL,          -- flowchart | table | histology_plate | anatomy | lifecycle | algorithm | comparison | other
  needs_ai_raster boolean DEFAULT false,
  render_prompt text NOT NULL,         -- the exact prompt that will generate the image
  status text NOT NULL DEFAULT 'pending', -- pending | prompt_ready | generated | optimized | uploaded | failed | approved
  storage_path text,
  public_url text,
  svg_code text,                       -- for Mermaid/SVG diagrams
  error_log text,
  reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Process:**
1. Build an Edge Function `tag-diagram-questions`.
2. It walks `QUESTION_BANK_DATA` and sends each question to Gemini 3.1 Flash Lite with a strict system prompt.
3. Gemini returns JSON:
   ```json
   {
     "is_diagrammatic": true,
     "diagram_kind": "flowchart",
     "needs_ai_raster": false,
     "render_prompt": "Generate a clean medical flowchart showing the pathogenesis of diabetic ketoacidosis..."
   }
   ```
4. Save results to `question_diagrams` with `status = 'prompt_ready'`.
5. Admin can review/approve/reject each row in an admin panel.

**Cost estimate for Stage A:**
- ~571 questions × 1 Gemini call ≈ 571 calls.
- Gemini 3.1 Flash Lite is very cheap; expect under $0.50–$1.00 for the full tagging pass.

## 3. Stage B — Image Generation Strategy (Two Tracks)

Not every diagram needs an expensive AI image. Split by `diagram_kind`:

### Track 1 — Code-Generated Diagrams (free, sharp, editable)
**Kinds:** flowchart, algorithm, lifecycle, pathway, comparison table, simple anatomy diagrams.

**Tools:**
- **Mermaid.js** for flowcharts, sequence diagrams, Gantt charts.
- **D2** (declarative diagramming) for complex pathways.
- **SVG templates** rendered server-side with a small Deno library.

**Process:**
1. Edge Function `generate-svg-diagram` receives `question_id`.
2. Looks up `render_prompt` from `question_diagrams`.
3. Calls Gemini to produce **Mermaid code** or raw **SVG markup** (not a PNG).
4. Stores `svg_code` in the table.
5. Optionally rasterizes to PNG for mobile compatibility using a headless renderer if needed.

**Advantages:**
- Near-zero cost.
- Vector-sharp on all screens.
- Easy to edit later by updating the Mermaid/SVG code.

### Track 2 — AI Raster Images (for histology / anatomy / clinical photos)
**Kinds:** histology plates, gross specimen photos, anatomy illustrations, ECG strips, clinical sign photos.

**Tools:**
- Lovable AI Gateway `https://ai.gateway.lovable.dev/v1/images/generations`.
- Default model: `openai/gpt-image-2` with `stream: true`, `quality: "low"`, `partial_images: 1`.
- Alternative for medical accuracy: `google/gemini-3.1-flash-image`.

**Process:**
1. Edge Function `generate-ai-diagram` receives `question_id`.
2. Sends the `render_prompt` to the AI Gateway.
3. Receives base64 PNG.
4. Stores raw PNG temporarily in `/tmp`.

**Cost estimate:**
- Assume ~30–40% of 571 questions need AI raster = ~170–230 images.
- At low quality 1024×1024, gpt-image-2 costs roughly $0.02–$0.04 per image.
- Total: ~$4–$9 for the initial batch.

## 4. Stage C — Compression & Format Optimization

Before uploading to Supabase Storage, convert every image to the smallest usable format:

1. **SVG/Mermaid** → keep as SVG (tiny, ~2–20 KB each).
2. **PNG from AI** → convert to **WebP quality 80**.
   - Typical reduction: 1.5 MB PNG → ~150–300 KB WebP.
   - If the image has transparency, keep PNG only when needed.
3. **Resize** images wider than 1200 px down to 1200 px for mobile.
4. **Cache headers** set to 1 year for immutable assets.

**Estimated storage after optimization:**
- ~400 SVGs × ~10 KB = 4 MB.
- ~170 WebPs × ~200 KB = 34 MB.
- **Total: ~38–45 MB** for the full visual library.

## 5. Stage D — Storage & Public URLs

Use a new Supabase Storage bucket `diagrams`:

```sql
-- Enable RLS on storage objects (Supabase Storage bucket policy)
-- Allow public read for authenticated users
```

Path convention:
```
diagrams/{year}/{subject}/{subtopic_key}/{question_id}.{webp|svg}
```

Update `question_diagrams` row:
- `storage_path`
- `public_url` (signed or public CDN URL)
- `status = 'uploaded'`

## 6. Stage E — UI Integration

Two places to show diagrams:

### A. Inline in QuestionBank / Notes View
When a question has a matching `question_diagrams` row with `status = 'uploaded'`:
- Show a small "View Diagram" chip.
- On tap, open a bottom sheet / modal with the image centered and pinch-to-zoom.
- For SVG/Mermaid, render inline using `dangerouslySetInnerHTML` or a Mermaid renderer.

### B. Dedicated "Diagrams" Tab
Add a new tab or filter in the app:
- "Diagrams by Year" → Subject → Subtopic → list of diagram cards.
- Useful for last-minute revision of all visual answers.

## 7. Stage F — Admin Queue Panel

Build a simple admin page (reusing existing `useIsAdmin` hook):

**Columns:**
- Question text (truncated)
- Year / Subject / Subtopic
- Diagram kind
- Status
- Preview thumbnail
- Actions: Approve / Regenerate / Delete

**Batch actions:**
- "Generate all pending SVG diagrams"
- "Generate all pending AI raster diagrams"
- "Re-run failed items"

**Rate limiting:**
- Process one diagram every 3–5 seconds to avoid AI Gateway / Gemini quotas.
- Use a `processing_lock` column or a separate `diagram_jobs` queue table if parallel workers are needed.

## 8. Current Storage Baseline

From the previous check:
- **Database size:** ~43 MB of 500 MB free limit.
- **Storage used:** ~0 MB of 1 GB free limit.
- After adding diagrams: **~85–90 MB database + storage**, well within free limits.

## 9. Recommended Build Order

1. **Migration:** create `question_diagrams` table + storage bucket + RLS policies.
2. **Edge Function:** `tag-diagram-questions` (Stage A) — run once, get exact counts.
3. **Admin Panel:** list tagged questions, let admin approve/reject.
4. **Edge Function:** `generate-svg-diagram` (Track 1) — handle flowcharts/algorithms.
5. **Edge Function:** `generate-ai-diagram` (Track 2) — handle histology/anatomy.
6. **Compression step:** add WebP conversion inside `generate-ai-diagram`.
7. **Upload step:** save to Supabase Storage and update the row.
8. **UI:** "View Diagram" chip in notes + dedicated Diagrams tab.
9. **Polish:** admin batch actions, retry failed jobs, offline caching.

## 10. Open Decisions

- Should the initial tagging pass run automatically on deploy, or only when an admin clicks "Scan questions"?
- For AI raster images, do you prefer OpenAI (`gpt-image-2`) or Gemini (`gemini-3.1-flash-image`) for medical accuracy?
- Should diagrams be bundled with the existing Pharmacology / FM+SPM premium plans, or offered as a separate unlock?
