# Plan

## 1. Third-year triple-tap → handwritten note for that ONE question

**Only** 3rd-year subjects (`forensic-medicine`, `community-medicine`) change behaviour. All other years keep triple-tap = Ask AI.

- Thread `yearKey` down to `QuestionCard`:
  - `src/components/QuestionSection.tsx` → pass `yearKey` into `QuestionList` and then `QuestionCard`.
  - `src/components/question-bank/SearchResults.tsx` → same.
  - `BrowseTab` already knows `yearKey`; pass it into `QuestionCard`.
- `QuestionCard.tsx` / `QuestionCardEnhanced.tsx`:
  - Accept `yearKey` prop.
  - If `yearKey === "third-year"`:
    - Change hint label "Triple tap to ask AI" → **"Triple tap → handwritten note"**.
    - On triple-tap dispatch new event `orbit:single-note` with `{ question, subjectKey, subjectName, year: "third" }` instead of `ai-triple-tap-answer`.
    - Detect subjectKey from `question-*` DOM ancestry OR pass a `subjectKey`/`subjectName` prop through Section/BrowseTab.
  - Double-tap MCQ behaviour unchanged.

## 2. Single-question note overlay

New component `src/components/handwritten/SingleQuestionNoteOverlay.tsx` mounted globally (in `App.tsx` alongside `DailyAdConsent`).

- Listens for `orbit:single-note`.
- Full-screen sheet with blurred backdrop, close button.
- Calls `generate-handwritten-notes` edge function with new payload flag `singleMode: true`, `questions: [question]`, `subject`, `subtopicName = <first 80 chars>`, `year = "3rd Year"`, no caching (subtopicKey = `single::<hash>`).
- Renders result through existing `HandwrittenNotesView` for the same colored/handwritten JSON UI.

## 3. Edge function: full-depth answer + revision tail

`supabase/functions/generate-handwritten-notes/index.ts`:

- Add `singleMode: z.boolean().optional()` to schema.
- When `singleMode`:
  - Skip cache lookup and DB write.
  - Force `[ESSAY]`-depth for "essay/discuss/describe/classify/explain/write on" questions and `[SHORT NOTE]`-depth for "short note/brief" questions — regardless of length.
  - Extra system-prompt block: **"Because this is a single-question note, produce the DEEPEST possible answer. For essays: 8–10 sections and >= 2 handwritten pages worth of content. For short notes: match textbook depth (5–8 bullets minimum, more if the textbook has more). ALWAYS end with a section of type `revision` listing 3–4 must-write-on-paper points."**
- Add new section type `revision` to the schema (payload `{ items: string[] }`); update `sectionPayloadFromTopLevel` / `normalizeNotesContent` to handle it.
- Textbook grounding stays: retrieval budget already 18k chars; for singleMode reuse the same `buildTextbookContext` on the one question.

## 4. HandwrittenNotesView: render `revision` type

`src/components/handwritten/HandwrittenNotesView.tsx`:

- Add `RevisionSection` — amber/gold highlighted card with `Trophy` icon and bold list of 3–4 must-write points.
- Wire into `renderPayload` switch.

## 5. Walkthrough skip recovery

Root cause: users who close/skip the walkthrough without saving a profile leave `local = null` in `useProfile`; year selectors fall back to `"second-year"`, and `requestDailyAd("progress")` triggers a consent modal whose rewarded-ad call is a no-op (native SDK not initialized without any prior interaction on some devices) so nothing visible happens after OK.

Fixes:

- `src/pages/Index.tsx`: **do not** call `requestDailyAd("progress")` when there is no local profile. Guard with `readLocal()`; fall through to normal tab switch.
- `src/components/shell/BrowseTab.tsx` (and any place using default-year fallback): when `local?.year` is missing, show the existing `YearPickerDialog` on first mount instead of silently defaulting to 2nd year. Reuse the existing "Select This Year / Default Year" button so users can change it any time.
- Confirm the year picker button remains reachable on the subjects list.

## 6. One-time recovery notice (no ad)

New component `src/components/RecoveryNotice.tsx`:

- On mount, checks `localStorage["orbit-recovery-notice-v1"] !== "shown"` AND `readLocal() === null` AND `localStorage["orbit-walkthrough-completed-v2"] === "true"` (user finished/skipped walkthrough but never saved name).
- Renders one-time full-screen dialog: **"We fixed a few issues — you can now open My Progress and change your default year from the Home screen. No ads will play for this popup."** with an "OK, got it" button.
- Sets flag `"shown"` on dismiss. Does not play any ad.
- Mount it in `App.tsx`.

## Technical details

- Event name kept namespaced: `orbit:single-note`.
- `subjectKey`/`subjectName` are threaded through the accordion chain so the third-year card knows which OCR textbook to ground with (Sia vs Vision) — the edge function already picks the book from `subject`.
- Revision section styling: amber card with `border-amber-400`, `bg-amber-50 dark:bg-amber-950/30`, trophy icon, list items with checkbox-style bullets, bold amber text.
- No new tables, no migration.
- Single-mode calls always run 1 batch (1 question), so no 25 s delay logic.

## Files touched

- `supabase/functions/generate-handwritten-notes/index.ts`
- `src/components/handwritten/HandwrittenNotesView.tsx`
- `src/components/handwritten/SingleQuestionNoteOverlay.tsx` (new)
- `src/components/RecoveryNotice.tsx` (new)
- `src/components/QuestionCard.tsx`
- `src/components/QuestionCardEnhanced.tsx`
- `src/components/QuestionSection.tsx`
- `src/components/question-bank/SearchResults.tsx`
- `src/components/shell/BrowseTab.tsx`
- `src/pages/Index.tsx`
- `src/App.tsx`

Approve and I'll implement in one pass.
