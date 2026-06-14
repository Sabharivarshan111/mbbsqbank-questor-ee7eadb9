# Fix leaderboard ranking + add screen-time tiebreaker

## Why the screenshot looks wrong
Both `Dr. K` and `Harini K` have **year_xp = 0** (1st year). The board correctly ranks by year_xp, so they're tied — current code only breaks ties by `streak` (both 2) then `name` (alphabetical). That is why "0 XP" can sit above "2 XP" (the "2" was Lifetime XP from another year, which does not affect ranking — by design).

The fix is to (a) make this obvious in the UI and (b) add a meaningful tiebreaker: **time spent in the app this year**.

## 1. Track screen time per user per year (backend)

New table `public.screen_time`:

```text
user_id  uuid
year     app_year
seconds  bigint  (running total)
weekly_seconds bigint
week_start date
updated_at timestamptz
PK (user_id, year)
```

RPC `record_screen_time(_seconds int)` — security definer:
- Reads `profiles.year` for `auth.uid()`.
- Upserts `seconds += _seconds`, and `weekly_seconds += _seconds` (reset when `week_start` rolls over).

Update both leaderboard RPCs to return new columns and use them as tiebreaker:

`get_year_leaderboard` SELECT adds `COALESCE(st.seconds,0) AS year_seconds`
ORDER BY `year_xp DESC, streak DESC, year_seconds DESC, display_name ASC`.

`get_weekly_leaderboard` adds `COALESCE(st.weekly_seconds,0) AS weekly_seconds`
ORDER BY `weekly_xp DESC, streak DESC, weekly_seconds DESC, display_name ASC`.

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_time;`

## 2. Client screen-time pinger
New `src/hooks/use-screen-time.ts`:
- Tracks active foreground time using `visibilitychange` + `requestAnimationFrame` heartbeat.
- Every 30 s while visible, calls `record_screen_time(secondsSinceLastPing)`.
- Flushes on `visibilitychange → hidden` and `beforeunload`.
- Mount once in `App.tsx`.

## 3. Leaderboard UI (`Leaderboard.tsx`)
- Sort already comes from the RPC; keep client sort identical so the local-XP override still produces the same order.
- Add a small caption under the tab row:
  *"Ties broken by streak, then time spent in the app this year."*
- Each row chip stays as `{primary} XP`. No layout change.

## 4. Stats dialog (`UserStatsDialog.tsx`)
- Add a 5th stat tile **"Time in app"** (clock icon) showing `Xh Ym` for the selected year (or weekly seconds when on weekly tab — pass through from row).
- Add it to the `EXPLAIN` map:
  > "Total time you've spent inside ORBIT this year. Used as a tiebreaker on the leaderboard when two students have the same XP and the same streak."
- In the YOU vs THEM compare block, add a `Compare` row for time-in-app when both are in the same year.
- Grid becomes 5 tiles → switch to `grid-cols-5` on sm+, `grid-cols-3` on mobile with a 2-row wrap.

## 5. Real-time wiring
- `use-leaderboard` and `use-weekly-leaderboard` already refetch on `question_progress` / `profiles` / `weekly_xp`. Add `screen_time` to the same channel so rank updates live as people study.

## 6. Types
Extend `LeaderRow` and `WeeklyRow` with `year_seconds` / `weekly_seconds`.

## Result
- Ranking metric stays Year XP (weekly tab: this-week Year XP). The "Lifetime XP" number is informational only — clarified in the explainer.
- When two users tie on XP + streak, whoever studied longer in the app this year ranks higher, updated live.
- Users can see screen-time on their own and others' stats card, and the dialog explicitly tells them it is the tiebreaker.

## Files touched
- new migration: `screen_time` table + grants + RLS + `record_screen_time` RPC + updated `get_year_leaderboard` / `get_weekly_leaderboard`
- new `src/hooks/use-screen-time.ts`
- `src/App.tsx` (mount the hook)
- `src/hooks/use-leaderboard.ts`, `src/hooks/use-weekly-leaderboard.ts` (new column, channel)
- `src/components/progress/Leaderboard.tsx` (caption, pass seconds to dialog)
- `src/components/progress/UserStatsDialog.tsx` (new tile + explainer + compare row)
