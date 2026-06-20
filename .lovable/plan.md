## Remove speech-to-text from AI chatbox

Roll back the voice-input feature added previously. No other changes.

### Files
- **src/components/chat/ChatInput.tsx** — Remove `useVoiceRecorder` import/usage, mic button, and recording/transcribing UI states. Restore plain text input + send button.
- **src/hooks/use-voice-recorder.ts** — Delete file.
- **supabase/functions/transcribe-audio/index.ts** — Delete file, and delete the deployed `transcribe-audio` edge function from Supabase.

### Not changed
- AI chat behaviour, chat history, send button, message rendering — all untouched.
- No DB / migration changes.
- Pomodoro timer is **not** touched in this plan (you can request that separately).
