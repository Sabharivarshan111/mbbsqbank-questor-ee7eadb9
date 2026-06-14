Root cause found: the app prevents XP from visually decreasing because several UI paths use `Math.max(...)` between old cloud XP and local XP. After an un-tick, local storage changes to lower XP, but the displayed XP/badge/leaderboard can keep the previous higher cloud value until a full cloud refetch lands. Some refetches also only listen to realtime, so missed or delayed events leave stale rows.

Plan:

1. Fix question un-tick RPC handling
   - Update `setQuestionDone` so un-ticking waits for `record_question_undone` to complete before firing the final progress refresh event.
   - Stop silently swallowing RPC failures; log warning details so future XP sync problems are visible.
   - Keep the UI checkbox immediate, but make the cloud refresh event happen after the server confirms the decrement.

2. Make dashboard XP allowed to decrease
   - Change `ProgressDashboard` so the primary XP shown in the XP card follows local completed count immediately after tick/un-tick.
   - Use cloud year XP only as a server-backed value, not as a permanent `Math.max` value that can block decreases.
   - Refresh `yearXp` on local `QUESTION_PROGRESS_EVENT`, not only Supabase realtime.

3. Make profile/badge XP allowed to decrease
   - Update `useXpStream` and `GlobalCelebrations` so they do not use `Math.max(previous/cloud/local)` for current XP.
   - Keep celebrations/toasts only for increases; for decreases, just update internal refs so badges/levels display the current lower XP correctly.

4. Make leaderboard recover from missed realtime
   - Update lifetime and weekly leaderboard hooks to refetch after local progress events with a short delay, so the RPC has time to finish and the row updates even if Supabase realtime is late.
   - Keep existing realtime subscriptions to `profiles`, `question_progress`, and `weekly_xp`.

5. Verify the backend undo path
   - Confirm `record_question_undone` decrements `profiles.xp`, `weekly_xp.xp`, and deletes the matching `question_progress` row.
   - If needed, add a small safe migration to make the function recompute XP from `question_progress` after undo so spam tick/untick cannot leave inflated XP.