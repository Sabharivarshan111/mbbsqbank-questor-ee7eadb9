## Root cause confirmed

- The latest deployed `generate-handwritten-notes` logs show direct Gemini failures:
  - `Gemini 429`
  - `generate_content_free_tier_requests, limit: 20`
- The notes feature currently creates multiple API calls per topic because it splits questions into batches (`batchSize: 6`) and calls the edge function repeatedly with only a 2-second client pause.
- So when one topic has many essay/short-note questions, notes can quickly consume the Gemini free-tier daily/request quota. That is why the screen shows “AI service is temporarily busy”.
- The current function also still tries Lovable AI Gateway first, but the logs prove the fallback direct Gemini path is still being hit and exhausted.
- Gemini 3.1 Flash-Lite model id is supported as `gemini-3.1-flash-lite`, so we can switch direct Gemini generation to that model using your existing `GEMINI_API_KEY`.

## Plan

### 1. Switch handwritten notes to your Gemini API as primary
- Update `generate-handwritten-notes` so notes generation uses only `GEMINI_API_KEY` by default.
- Change the direct Gemini model from `gemini-2.5-flash` to `gemini-3.1-flash-lite`.
- Remove the Lovable AI Gateway primary path from this function so it does not use Lovable AI for handwritten notes.
- Keep clear server-side error messages if `GEMINI_API_KEY` is missing, invalid, or quota-limited.

### 2. Reduce Gemini 429 errors with safer batching
- Increase the client delay between batches from 2 seconds to a safer interval.
- Lower each batch size if needed so each response is smaller and less likely to timeout.
- Stop retrying immediately on Gemini `429`; instead return a clear “quota/rate limit” message with a retry-after style instruction.
- Keep the existing cache behavior: once a subtopic is generated and saved, future opens reuse cached notes and do not call Gemini again.

### 3. Make notes generation more resilient
- If one batch fails after some content was generated, show the completed sections instead of a full blank error whenever possible.
- Save successful merged notes only when all batches are complete, to avoid caching incomplete notes as final.
- Improve the error box text so it explains whether the issue is quota/rate limit, timeout, invalid JSON, or missing API key.

### 4. Improve the handwritten notes prompt quality
- Add prompt rules so every section must include a valid icon, with fallback icons if the model is unsure.
- Add medical-note formatting instructions:
  - include mnemonics and high-yield points where useful
  - include flowcharts/cycles where feasible for questions asking “cycle”, “pathway”, “steps”, or “mechanism”
  - no page numbers or textbook citations
- For Community Medicine communicable disease topics, add a structured template per disease:
  - agent factors: agent, source of infection, period of communicability
  - host factors: age/sex affected, immunity
  - environmental factors
  - mode of transmission
  - incubation period
  - clinical features
  - complications
  - prevention/control: immunization, vaccination, public health measures
  - treatment where relevant

### 5. Continue previous requested app fixes
- Keep the three independent daily ad buckets:
  - My Progress: once per calendar day
  - Theme change: once per calendar day
  - Essay/Short Notes together: once per calendar day
- Ensure no ads play during walkthrough.
- Keep the search-result glow behavior in the target chapter/question.
- Add the note-edit AI chat box below Regenerate as a follow-up improvement after the core Gemini generation is stable.
- Re-check home Total Study Time path after implementation.

### 6. Validate after changes
- Deploy the updated `generate-handwritten-notes` edge function.
- Test the deployed function with a small sample request using `gemini-3.1-flash-lite`.
- Read the edge logs after testing to confirm whether the failure is gone or whether Google is still rejecting the API key due to project quota.

## Important note

Switching to `gemini-3.1-flash-lite` will reduce cost/latency and may improve limits, but if the Google AI Studio project/API key is already out of free-tier quota for the day, any direct Gemini model can still return `429` until quota resets or billing is enabled.