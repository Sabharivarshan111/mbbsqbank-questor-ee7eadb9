Implement leaderboard-safe un-tick behavior so checked questions add XP once, unchecked questions remove that XP, and the leaderboard refreshes immediately.

1. **Add a Supabase undo RPC**
   - Create `record_question_undone(_question_id text)`.
   - It will delete the user’s matching `question_progress` row only if it exists.
   - If deleted, it will decrement:
     - `profiles.xp`
     - `daily_activity.questions_done` for the original completion date
     - `weekly_xp.xp` for the original completion week/year
   - Use `GREATEST(..., 0)` so XP never becomes negative.
   - Grant execute permission to `authenticated`.

2. **Update checkbox sync logic**
   - Keep `setQuestionDone(question, true)` calling the existing add-XP RPC.
   - Make `setQuestionDone(question, false)` call the new undo RPC.
   - Keep localStorage in sync with the cloud result.
   - Dispatch the existing local progress event after both tick and un-tick so UI refreshes immediately.

3. **Keep bulk local sync safe**
   - Continue uploading locally checked questions to cloud.
   - Do not bulk-delete cloud progress just because a local key is missing, because that could erase progress from another device.
   - Only explicit user un-ticks should remove XP.

4. **Realtime leaderboard refresh**
   - Existing subscriptions to `profiles`, `weekly_xp`, and `question_progress` will refresh on inserts, updates, and deletes.
   - Ensure both lifetime and weekly leaderboard hooks refetch after the local progress event.

5. **Verify ranking math**
   - Leaderboard order should rank higher XP above lower XP.
   - A user with 10 XP should not appear below users with 0 XP.
   - Unchecking a question should immediately reduce the user’s XP/rank instead of allowing spam.