# High-Yield Questions Feature for AI Chat

Let users ask the AI things like "important essays in Community Medicine Paper 2 – Demography" and get back a ranked list straight from the existing question bank, sorted by asterisk (repetition) count. No data files are touched. All existing AI chat features keep working unchanged.

## What the user gets

In the AI chat, queries like these will be detected and answered from the local question bank:
- "Community Medicine Paper 2 demography important essays"
- "Top 20 short notes for Pharmacology CNS"
- "I have exam tomorrow in Community Medicine Paper 2, give me 5 high yield essays"
- "Most repeated questions in Forensic Medicine toxicology"

The reply shows essays and/or short notes ranked **highest asterisk count first** (most repeated), with the asterisks shown next to each question, e.g.:

```
**Demography & Family Planning — Most Repeated Essays**
1. Define demographic cycle… ★★★★★ (5)
2. Discuss family planning methods… ★★★★ (4)
...
**Short Notes**
1. NRR ★★★★
2. Couple protection rate ★★★
```

If the user doesn't specify a number → defaults to **Top 10 essays + Top 20 short notes**.

## How it works (technical)

All client-side. No edge function changes. No question-bank data changes.

### 1. New helper: `src/lib/high-yield-query.ts`
- `detectHighYieldIntent(prompt: string)` → returns `{ subject, paper?, subtopic?, types: ('essay'|'short-notes')[], limits: { essay?, shortNotes? } } | null`
  - Matches keywords: "important", "high yield", "most repeated", "high-yield", "exam tomorrow", "top N", "essays", "short notes".
  - Fuzzy-matches subject/paper/subtopic names against keys in `QUESTION_BANK_DATA` (case-insensitive, normalised, handles "paper 2" / "paper two" / "p2").
- `getRankedQuestions(intent)` → walks `QUESTION_BANK_DATA`, finds the matching subtopic(s), reads each question's asterisk count (already parsed by your existing `question-count` util), and returns sorted arrays of `{ text, stars }`.
- `formatHighYieldResponse(intent, results)` → returns a markdown string ready to inject as an assistant message (headings, numbered lists, ★ display, fallback "No matches found in QB" message).

### 2. Hook integration: `src/hooks/use-ai-chat.ts`
- Inside `handleSubmit` / `handleSubmitQuestion`, **before** calling the edge function:
  1. Run `detectHighYieldIntent(prompt)`.
  2. If it returns a match → build the ranked response locally, push it as an assistant message, clear loading, return. (No AI call, no token cost, instant.)
  3. If no match → existing flow runs untouched (Gemini call, references, queue, rate-limit handling — all preserved).

### 3. Empty-state hint (optional, low-risk)
- Add one example chip in `src/components/chat/EmptyChatState.tsx` like: *"Important essays in Community Medicine Paper 2 – Demography"* so users discover the feature.

## What stays exactly the same
- `QUESTION_BANK_DATA` and every `src/data/topics/*` file — **not edited**.
- Triple-tap "answer this question" flow.
- Double-tap "generate MCQs" flow.
- Normal free-form chat → still goes to `ask-gemini` / `ask-ai` edge function.
- Rate limiting, queueing, references, fullscreen, themes, offline banner — all untouched.
- MCQ formatting rules from memory (green correct answer highlight, new lines).

## Files to add / edit
- **Add** `src/lib/high-yield-query.ts` (intent detection + ranking + formatting)
- **Edit** `src/hooks/use-ai-chat.ts` (short-circuit in submit handlers only)
- **Edit (optional)** `src/components/chat/EmptyChatState.tsx` (one example prompt)

## Edge cases handled
- Subject named but no subtopic → returns top questions across all subtopics of that subject/paper.
- Subtopic matches but has no questions of requested type → message: *"No essays found for this subtopic — here are the short notes instead."* (matches your existing "No essays found" fallback pattern.)
- Ambiguous match (e.g. "medicine" → General Medicine vs Community Medicine) → asks user to clarify in one short assistant message instead of guessing.
- Asterisk count missing on a question → treated as count 1, still ranked, no crash.

## Verification after build
- Type `"Community Medicine Paper 2 demography important essays"` → ranked list appears instantly (no network call).
- Type a normal question like `"explain insulin resistance"` → still hits Gemini as before.
- Triple-tap a question card → still triggers the answer flow.
- Double-tap → still generates MCQs.
