## Goal
Make AI chat reliably answer exam/high-yield/important-question prompts from the in-app Question Bank first, before calling Gemini/online AI.

## What I will change
1. **Improve intent detection**
   - Treat prompts like “tomorrow exam”, “tell questions”, “important”, “high yield”, “most repeated”, “paper two community medicine” as question-bank lookup requests.
   - Detect requests even when the user does not type “essay” or “short note”.
   - Default output stays: **Top 10 essays + Top 20 short notes**.

2. **Add typo-tolerant subject matching**
   - Match subjects using aliases plus fuzzy matching.
   - Examples that should work:
     - `comunit medicine`
     - `communit medicine`
     - `community medicine paper to`
     - `paper two community medicine`
     - `psm paper 2 important questions`

3. **Fix paper detection wording**
   - Support `paper 2`, `paper two`, `paper to`, `paper too`, `p2`, `2nd paper`, and reversed wording like `paper to community medicine`.

4. **Prevent bad subtopic extraction**
   - Current detector may treat leftover words like “paper to” or “tomorrow exam” as a subtopic, causing empty/no-result responses.
   - I’ll clean filler words better and only narrow to a subtopic when there is a real match.

5. **Question-bank-first fallback**
   - If the prompt looks like an important/exam-question request and a subject is found, it will return QB results locally.
   - Only normal medical explanation prompts will continue to Gemini/online AI.

## Technical details
- Edit only:
  - `src/lib/high-yield-query.ts`
  - possibly small cleanup in `src/hooks/use-ai-chat.ts`
- Replace exact-only matching with a small local fuzzy matcher using normalized strings and edit distance/token overlap.
- Keep existing triple-tap, double-tap MCQ, normal AI Q&A, references, rate limit, and chat history behavior unchanged.

## Verification examples
After implementation, these should return ranked QB essays/short notes instantly:
- `tell me important questions in community medicine paper two`
- `tell important questions in paper to comunit medicine`
- `tomorrow exam psm p2 give questions`
- `high yield essays demography community medicine paper 2`

Normal prompts like `explain insulin resistance` should still go to Gemini.