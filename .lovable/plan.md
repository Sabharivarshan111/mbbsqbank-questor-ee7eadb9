Root cause found:
- The Quiz button calls `quiz-from-subtopic`.
- That Edge Function directly calls Lovable AI Gateway with a raw `fetch` request using the wrong/old gateway header pattern and a strict JSON schema payload.
- When the gateway rejects that call, Supabase returns a non-2xx error and the app only shows the generic message: “Edge Function returned a non-2xx status code”.
- The Edge Function logs only show boot/shutdown, so the current function also does not log enough detail to debug failures from the app.

Plan to fix:
1. Update `supabase/functions/quiz-from-subtopic/index.ts`
   - Use the same working gateway style as the existing AI chat function: `Authorization: Bearer LOVABLE_API_KEY`.
   - Add safe request logging for subject, question count, gateway status, and parse failures.
   - Remove/relax the fragile `response_format` schema if it is causing provider rejection, while still enforcing JSON via prompt and server-side validation.
   - Add a fallback JSON extraction step so MCQs still parse if the model returns a code fence or extra text.
   - Return clearer user-facing errors for missing key, billing/credits, rate limit, invalid input, and parse failure.

2. Improve `src/components/progress/QuizSession.tsx`
   - Show the real Edge Function error message from `error.context`/response body instead of only “non-2xx”.
   - Keep the quiz dialog open long enough to show a clean inline error and Retry button instead of instantly closing.
   - Make the function call stable so it does not refire unnecessarily when React re-renders.

3. Verify the fix
   - Test `quiz-from-subtopic` directly with a sample subject and 3+ studied questions.
   - Confirm the subject Quiz button opens a generated MCQ quiz instead of the red toast.
   - If the gateway returns a real billing/rate-limit issue, the app will display that exact cause cleanly rather than a vague non-2xx message.