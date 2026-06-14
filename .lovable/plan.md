# Plan: Year-XP-driven leaderboard + stat explainers

## 1. Leaderboard becomes year-XP only (real-time)

**`src/components/progress/Leaderboard.tsx`**
- Remove the **Weekly / Lifetime** period tabs and the "resets in Xd Xh" countdown entirely. There is only one ranking now.
- Keep the **My Year / Global** scope tabs:
  - **My Year**: ranks every user in the selected year by *that year's XP* (questions ticked in that year only). Switching year (via the profile edit) shows the new year's board with new rankings — a user who has 1 XP in 1st Year but 0 in 2nd Year will rank in 1st Year and not appear in 2nd Year.
  - **Global**: same year-XP metric but across all years, so you can see top scorers per their own year.
- Drop `useWeeklyLeaderboard` from this screen. Use only `useLeaderboard` (year RPC) and have it drive the single column shown as `XP`.
- Current-user row override stays driven by `countLocalYearXp(year)` so un-ticks shrink rank instantly. Override uses `Math.min(cloud, local)` to avoid raising cloud values.
- Sort: `year_xp DESC, streak DESC, name ASC`.
- Row right-side chip shows `{year_xp} XP` (rename label so it's clear it's year XP). The small year pill (`1st`, `2nd`, …) stays on Global view only.

**`src/hooks/use-weekly-leaderboard.ts`** — no longer used by the leaderboard UI. Leave the file in place (still imported by nothing after this change) but it can be deleted in the same pass to keep the codebase clean.

## 2. Stat tiles become tappable explainers

**`src/components/progress/UserStatsDialog.tsx`**
- Convert each of the 4 stat tiles (`Year XP`, `Lifetime`, `This Week`, `Streak`) into buttons. Tapping one opens a small inline panel below the grid (or a `Popover`) that explains:
  - **Year XP** — "Questions you've ticked done in your current MBBS year. This is what drives the leaderboard ranking. Tick a question to earn 1 XP; un-tick to lose it."
  - **Lifetime** — "Total questions ever ticked across all years. Does not affect leaderboard ranking — it's just a record of your overall study volume."
  - **This week** — "Questions ticked since Monday. Resets every Monday at 00:00. Currently informational only — no longer used for ranking."
  - **Streak** — "Consecutive days you opened the app. Open the app daily to grow it; missing a day resets it to 1."
- Only one panel open at a time; tap again or another tile to switch. Add a small `Info` icon on each tile to hint they're tappable.

**Comparison block** is simplified accordingly: keep `Year XP` (primary), `Streak`, and drop `This week` and the duplicate `Solved` row. The pep talk text uses year XP gap.

## 3. Dashboard polish (`ProgressDashboard.tsx` + `StreakXPCard.tsx`)
- `xp` already comes from local `completed` (year-scoped) — good. Rename the prop on `StreakXPCard` from `xp` (ambiguous) to `yearXp` and update the subtitle to read "Year XP" explicitly.
- Keep the lifetime line as a quiet subtitle ("Lifetime: N XP") so users still see the cumulative number, but it is clearly secondary.
- `StreakXPCard` badges already key off `xp` (= year XP). No logic change, just labels.
- `RewardsShelf` continues to use year XP (already wired via `xp` prop from dashboard).

## 4. What does NOT change
- Backend: `get_year_leaderboard`, `record_question_done`, `record_question_undone` already do the right thing. No migration needed.
- Year switching: already updates `year` in `profiles`, so the year-scoped RPC will return the new board automatically; real-time channel on `question_progress` + the local `QUESTION_PROGRESS_EVENT` keep it live.
- Profile / walkthrough / study content untouched.

## Technical notes
- The `useMemo` in Leaderboard collapses to a single `rows` source (lifetime hook, year-scoped). The dedupe-by-name logic stays.
- `UserStat` type keeps `weekly_xp` and `xp` fields (still shown in the dialog explainers); no backend shape change.
- All real-time wiring (`QUESTION_PROGRESS_EVENT`, postgres_changes on `question_progress` and `profiles`, two delayed refetches after a tick) is already in place from prior work.
