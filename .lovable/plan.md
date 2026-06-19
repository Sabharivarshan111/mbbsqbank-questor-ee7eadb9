# Quick answer to your question

Yes — Lovable recently added **built-in Speech-to-Text** through the Lovable AI Gateway. Key facts:

- **Built by Lovable?** It's a Lovable-hosted gateway that proxies OpenAI's `gpt-4o-mini-transcribe` model. So Lovable provides the integration; the underlying STT model is OpenAI.
- **Free?** No — it uses your **workspace AI credits** (same credits as Gemini chat). It is not a separate paid plan, and there's a generous free monthly credit allowance. Cost per minute of audio is small (fractions of a credit).
- **Easy to implement?** Yes. It needs one new Supabase Edge Function (~30 lines) and a mic button in the chat. No API keys to manage — `LOVABLE_API_KEY` is already provisioned.

# Plan: Add voice input to your AI chatbox

## What you'll get
A microphone button next to the chat input. Tap it → it records → tap again to stop → the transcript fills the input box, and you can review/edit before sending. English by default, auto-detects other languages.

## Steps

1. **New edge function** `supabase/functions/transcribe-audio/index.ts`
   - Accepts `multipart/form-data` with an audio file from the client
   - Forwards to `https://ai.gateway.lovable.dev/v1/audio/transcriptions` using `LOVABLE_API_KEY` and model `openai/gpt-4o-mini-transcribe`
   - Returns the transcript JSON
   - CORS headers, no JWT verification (or with verification — match existing chat function)

2. **New hook** `src/hooks/use-voice-recorder.ts`
   - Uses `MediaRecorder` with `audio/webm` (Chrome/Android) or `audio/mp4` fallback (iOS Safari) — important since you ship via Capacitor
   - `start()`, `stop()` returning a `Blob`
   - Guards: mic permission errors, empty/silent recordings (<1KB), unsupported codec
   - Names the upload file extension to match the recorded MIME (`recording.webm` or `recording.mp4`) — required by the model

3. **Mic button in the chat input**
   - Add to the existing AI chat component (wherever the chat input lives — likely `src/components/chat/...` or similar)
   - States: idle (mic icon), recording (pulsing red + timer), transcribing (spinner)
   - On stop: POST blob to the new edge function, set returned text into the existing input field
   - Toast errors for permission denied / no speech / network failures

4. **Capacitor microphone permission**
   - Add `RECORD_AUDIO` permission to `android/app/src/main/AndroidManifest.xml` (only matters when you next build the APK; web preview works without it)

## Technical notes (skip if not interested)
- Endpoint: `POST https://ai.gateway.lovable.dev/v1/audio/transcriptions` (OpenAI-compatible)
- Model: `openai/gpt-4o-mini-transcribe` (default) — accurate, low cost
- Language: omit the `language` param so it auto-detects; works great for English
- The mic key (`LOVABLE_API_KEY`) stays server-side in the edge function — never exposed to the browser/APK
- Errors handled: 402 (out of credits → toast), 429 (rate limited → retry hint), 400 (bad audio → re-record prompt)

## Files to be created/edited
- **Create:** `supabase/functions/transcribe-audio/index.ts`
- **Create:** `src/hooks/use-voice-recorder.ts`
- **Edit:** the existing AI chatbox component (mic button + wiring)
- **Edit:** `android/app/src/main/AndroidManifest.xml` (mic permission for APK)

No database changes, no migrations, no new dependencies.
