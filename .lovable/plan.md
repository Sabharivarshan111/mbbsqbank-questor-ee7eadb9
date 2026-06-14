## Goal

When the user switches year, the XP shown in "My Progress" and the leaderboard rank/XP should reflect only that year's completed questions — in realtime, both on tick and un-tick.

## Root cause

- `readLocalXp()` counts every `question-*` key in localStorage globally, so the local override in `Leaderboard.tsx` always uses lifetime XP instead of year-scoped XP.
- The Leaderboard local override uses this global `localXp` for `year_xp` and `weekly_xp`, masking year differences when switching years.
- `ProgressDashboard` already computes year-scoped `completed`, but falls back to cloud `yearXp` only when local is 0, and the XP shown is `completed || yearXp` (works, but should be explicit and update on year change).

## Plan

1. **Add a year-scoped local XP helper** in `src/lib/question-progress.ts`:
   - `countLocalYearXp(year: Year): number` — uses `getYearNode(year)` + `collectQuestions` for both `essay` and `short-notes`, dedupes, then counts `isQuestionDone`. This mirrors what `ProgressDashboard` already does.

2. **Update `Leaderboard.tsx`** to use year-scoped local XP:
   - Replace `readLocalXp()` with `countLocalYearXp(year)`.
   - Recompute when `year`, `scope`, or `QUESTION_PROGRESS_EVENT` fires (storage event too).
   - In the current-user override:
     - `year_xp = scope === "year" ? Math.min(meRow.year_xp, liveYearXp) : meRow.year_xp` (only override when viewing this year's board; global scope keeps cloud lifetime).
     - `weekly_xp = Math.min(meRow.weekly_xp, liveYearXp)` only when `scope === "year"`.
     - Leave `xp` (lifetime) cloud-driven; do not lower it from year XP.
   - Re-sort happens automatically from the existing memo.

3. **Polish `ProgressDashboard`**:
   - Keep `completed` as the primary XP display (already year-scoped) and rename the variable used for the badge/rewards card to make it explicit: `xp = completed` for the current year. Cloud `yearXp` stays as a backfill only when local is empty after first load.
   - Ensure switching year forces `xp` recompute (already happens via `year` dep in the memo).

4. **No backend changes** — `get_year_leaderboard` and `get_year_lifetime_xp` are already year-scoped server-side; this is purely a frontend correctness fix to the optimistic local override.

## Expected result

- Tick 1 question in 1st Year → 1st Year leaderboard shows 1 XP for you; switching to 2nd Year shows 0 XP and rank drops accordingly, in realtime.
- Un-ticking in the active year reduces that year's XP and rank instantly.
- Global ("All years") leaderboard continues to show lifetime XP and is not lowered by year overrides.
