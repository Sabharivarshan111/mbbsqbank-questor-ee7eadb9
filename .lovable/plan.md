## Problem

In the AI chatbot, short-note repetition counts are correct, but the **Top Essay Questions** list (e.g. "important questions in forensic medicine") is ordered wrong — high-frequency essays are not at the top, and counts don't match what the Question Bank UI shows on the same essay.

## Root cause

There are two different "count asterisks" implementations, and they disagree.

1. **Question Bank UI** — `src/components/QuestionCard.tsx` `countAsterisks()`
   - Matches `[\*★☆⭐]` anywhere in the text and returns the **total count** of all star-like characters.
   - Falls back to counting exam-date entries inside `(...)` when no stars exist.
   - This is what the user sees on each card → "correct".

2. **AI high-yield path** — `src/lib/high-yield-query.ts` `countAsterisks()` (used by `getRankedQuestions` → "Top 10 Essays" in chat)
   ```ts
   const matches = q.match(/\*+/g);
   return matches.reduce((m, r) => Math.max(m, r.length), 0);
   ```
   - Only matches plain `*` (ignores `★ ☆ ⭐`).
   - Returns the **max length of any single run**, not the total. So `** ... ***` → 3 instead of 5, and `*  *  *` → 1 instead of 3.
   - No date-based fallback.

   Result: essays with stars split across the string, or written with `★`, get under-counted or all collapse to the same value, so sort order looks random vs the UI.

3. **Legacy fallback path** — `src/hooks/use-ai-chat.ts` `extractQuestions()` uses `question.match(/\*+/)` (first run only, no `g` flag). Same family of bug; runs only when the high-yield path doesn't match the request.

## Fix

Make both AI-side counters behave exactly like the Question Bank UI counter.

### 1. `src/lib/high-yield-query.ts`

Replace `countAsterisks` with the UI's logic:

```ts
function countAsterisks(q: string): number {
  const starMatches = q.match(/[\*★☆⭐]/g);
  if (starMatches && starMatches.length > 0) return starMatches.length;

  // Fallback: count exam-date entries in (Jan 23, Jun 24; ...) style
  const datePattern = /\(((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2,4}[,;]?\s*)+)\)/i;
  const dateMatch = q.match(datePattern);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
  }
  return 0;
}
```

Also extend `cleanQuestionText` to strip `★ ☆ ⭐` along with `*` so the displayed essay text stays clean.

### 2. `src/hooks/use-ai-chat.ts` `extractQuestions`

Use the same shared logic (sum of all star-like chars + date fallback) instead of `/\*+/` first-match.

### 3. Optional consolidation

Export a single `countAsterisks` helper from `src/lib/question-count.ts` (or `high-yield-query.ts`) and import it from `QuestionCard.tsx`, `QuestionCardEnhanced.tsx`, `high-yield-query.ts`, and `use-ai-chat.ts` so this never drifts again. Behavior-preserving for the UI.

## Out of scope

No changes to the Edge Function (`ask-gemini`), the question bank data, or the chat UI. Short-note counts already work and stay unchanged — they go through the same fixed helper so they'll keep working.

## Verification

- Ask in chat: "important questions in forensic medicine" → top of the essay list should be the same essays that show the highest 🔥 badge in the Question Bank UI for Forensic Medicine.
- Spot-check 2–3 essays: count shown in chat == count shown on the card.
- Short-notes ordering for the same query remains correct.
