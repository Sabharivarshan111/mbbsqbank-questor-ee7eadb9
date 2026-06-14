I found two likely causes:

1. The default leaderboard is `This Week`, so it ranks by `weekly_xp`. If a user has 20 total/year XP but 0 XP this week, they can appear below a 0-total-XP user because the current tiebreaker is streak.
2. `question_progress` is not enabled in Supabase Realtime, so year-scoped leaderboard refresh can miss live updates unless another table update happens at the same time.

Plan:

1. Update leaderboard database ordering
   - Change `get_weekly_leaderboard` so ranking is:
     - current week XP first
     - then year XP / lifetime XP
     - then streak only as a final tiebreaker
   - Keep `get_year_leaderboard` ranking as:
     - selected-year XP first
     - then lifetime XP
     - then streak only as a final tiebreaker
   - This prevents 0-XP users from ranking above users with real XP just because of streak.

2. Enable complete realtime updates
   - Add `question_progress` to the Supabase Realtime publication.
   - Keep `weekly_xp` and `profiles` subscriptions.
   - This lets leaderboard refresh as soon as questions are solved.

3. Update frontend sorting to match backend
   - In `Leaderboard.tsx`, for weekly rows sort by:
     - weekly XP
     - year XP / lifetime XP
     - streak
   - For lifetime/year rows sort by:
     - selected-year XP
     - lifetime XP
     - streak
   - This protects against stale/unsorted RPC results and keeps the UI consistent.

4. Make weekly leaderboard less confusing
   - Keep the visible primary score as weekly XP in the `This Week` tab.
   - Add a small secondary XP value for total/year XP when needed, so users understand why a 0-week-XP user with 20 year XP can rank above another 0-week-XP user.

Technical details:

- Files to edit:
  - `src/components/progress/Leaderboard.tsx`
- Database migration:
  - replace `public.get_year_leaderboard`
  - replace `public.get_weekly_leaderboard`
  - add `public.question_progress` to `supabase_realtime` safely with a duplicate-check block

No profile, XP, streak, or question completion logic will be changed.