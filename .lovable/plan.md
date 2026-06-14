## Root cause

- **Rewards stay unlocked because they read permanent localStorage unlock history**: `RewardsShelf` treats `state.unlocked[b.id]` as enough to keep a badge visible forever, even when current XP drops below the threshold.
- **XP/rank can stay stale because leaderboard depends on cloud refresh timing**: local un-ticks update localStorage immediately, but leaderboard rows only change after the undo RPC commits and refetch/realtime arrives.
- **Current user needs an immediate local override**: while Supabase catches up, the app should display the current user's XP/rank from the local tick count so spam tick/untick cannot leave the old rank visible.

## Plan

1. **Make XP badges reversible in Rewards**
   - Update `RewardsShelf` so XP badges unlock only from current `xp >= threshold`.
   - Remove `state.unlocked[b.id]` from XP badge display logic so Bronze disappears when XP drops below 10.
   - Keep stored unlock history only for celebration/toast suppression, not for current badge ownership.

2. **Keep reward totals based on current XP**
   - Change the `Rewards` counter (`x / total`) to count badges currently earned from live `xp` and `streak`, instead of permanent localStorage history.

3. **Patch the current user row instantly in leaderboard**
   - In `Leaderboard`, compute the current user's live local XP from checked questions.
   - While waiting for Supabase, override the current user's displayed `primary`, `xp`, `year_xp`, and `weekly_xp` where appropriate so XP and rank recalculate immediately after un-tick.
   - Re-sort rows after this override so rank changes in real time.

4. **Make cloud refetch more reliable after undo**
   - In leaderboard hooks, perform two delayed refetches after `QUESTION_PROGRESS_EVENT` (short + longer) so slow RPC commits or delayed realtime cannot leave stale rows.
   - Keep existing Supabase realtime subscriptions.

5. **Harden backend XP consistency if needed**
   - Add a safe database function/migration only if required to recompute `profiles.xp` from `question_progress` after undo, ensuring cloud leaderboard cannot stay inflated even if earlier data drifted.

## Expected result

- Tick 10 questions: Bronze appears and leaderboard XP/rank rises.
- Un-tick back below 10: Bronze disappears immediately.
- Un-tick to 0: rewards show no XP badge, dashboard XP is 0, and leaderboard rank/XP drops in real time.