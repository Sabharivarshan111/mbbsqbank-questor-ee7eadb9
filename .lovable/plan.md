## Goal
Make the “studying now” number stop showing a misleading constant `1`.

## Plan
1. **Replace the current Supabase Presence approach**
   - Supabase Presence is not syncing reliably across your anonymous mobile users.
   - I’ll replace it with a simple public heartbeat table: each device writes a small “I’m active” ping every few seconds.
   - The app counts devices seen recently, so multiple phones should show `2`, `3`, etc.

2. **Add safe cleanup logic**
   - Only count users active in the last ~45 seconds.
   - This avoids old closed phones/tabs staying counted forever.

3. **Update the Pomodoro badge**
   - Keep the same UI text: `👥 X studying now`.
   - If the live count cannot load, hide the badge instead of showing fake `1`.

4. **Fallback if database permission blocks it**
   - If the heartbeat table can’t be added or approved, I’ll remove the “studying now” badge completely so users are not misled.

## Technical details
- Create a `public.study_presence` table with explicit `GRANT`s and RLS policies for anonymous insert/update/read.
- Update `src/hooks/use-online-presence.ts` to upsert a device ID and query recent active rows.
- Update `src/components/PomodoroTimer.tsx` to render the count only when it is actually available.