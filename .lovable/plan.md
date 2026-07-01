# Root cause

- `quiz-from-subtopic` calls **only** the Lovable AI Gateway (`ai.gateway.lovable.dev`) using `LOVABLE_API_KEY`. The workspace is out of Lovable credits, so the gateway returns **402 Payment Required** → the edge function returns non-2xx → UI shows "Quiz unavailable".
- `ask-gemini` (AI chat) tries the Lovable Gateway first and only falls back to direct Gemini if the gateway fails. When the gateway returns 402/timeout, chat degrades or errors out too.
- Your `GEMINI_API_KEY` secret is already set in Supabase — it is currently only used as a fallback in `ask-gemini`, and not used at all in the quiz function.

# Fix: use your Gemini API key directly (Google Generative Language API), drop Lovable Gateway dependency

## 1. `supabase/functions/quiz-from-subtopic/index.ts`
- Remove all Lovable Gateway code (`ai.gateway.lovable.dev`, `LOVABLE_API_KEY`).
- Call Google Gemini directly:
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
  - Body: `{ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }`
- Keep existing `stripJsonFence` + `isValidMcq` validation and the 5-MCQ cap.
- Error mapping:
  - Missing `GEMINI_API_KEY` → clear "AI quiz is not configured" message.
  - `429` → "Gemini is rate-limited, try again shortly".
  - `400/403` → surface Gemini's `error.message` (usually key/permission issue).
  - Other 5xx → generic retry message.
- Add safe logs: subject, question count, Gemini status, parse failures.

## 2. `supabase/functions/ask-gemini/index.ts`
- Flip priority: **direct Gemini first, Lovable Gateway removed** (or kept only as an optional last-resort behind an env flag).
- Use existing `@google/generative-ai` client already imported (`genAI.getGenerativeModel({ model: "gemini-2.5-flash" })`).
- Preserve conversation history, system prompt, image handling, streaming/timeout logic already in place.
- Same error mapping as quiz (402 disappears entirely because we're not touching the gateway).

## 3. Frontend — no behavior change required
- `QuizSession.tsx` already reads the edge function's `error` field and shows a Retry button — that stays.
- Users will now see real Gemini errors (rare) instead of the constant "Lovable credits" 402.

## 4. Verification
- Deploy both functions.
- `curl` `quiz-from-subtopic` with a sample subject + 5 questions → expect `{ mcqs: [...] }` with 5 items.
- Open a subject in the app, click **Quiz** → 5 MCQs render.
- Open AI chat, ask a medical question → response streams from Gemini directly.
- Confirm no Lovable Gateway calls in the edge function logs.

## Notes / trade-offs
- Google's free Gemini tier has per-minute quotas; `gemini-2.5-flash` is generous but if you hit 429 we'll surface it clearly.
- If you ever want image generation, that still requires Lovable AI Gateway credits — Gemini API does not do image gen on this key. Chat + quiz text generation both work fully on the direct Gemini key.
- No schema/DB changes. No new secrets — `GEMINI_API_KEY` is already stored.
