## Problem

After the weekly leaderboard "resets" (Monday 00:00 in the user's local time, IST), the dialog and leaderboard still show **1 XP** for "This week" even though no question was ticked this week.

## Root cause

`get_weekly_leaderboard` (and `record_question_done` / `record_questions_done` / `record_question_undone`) compute the current week using:

```
date_trunc('week', CURRENT_DATE)::date
```

Postgres runs in **UTC**, so `CURRENT_DATE` is the UTC date. For users in IST (UTC+5:30) the local week rolls over to Monday **5.5 hours before** the server week does. During that gap:

- Local clock = Monday (new week) → user expects weekly XP = 0
- Server week_start = still last Monday → returns last week's row → weekly XP = 1

Same drift causes the "1 XP" to linger in `StreakXPCard` / leaderboard until UTC catches up.

## Fix

Anchor the "current week" to **Asia/Kolkata** in every place that reads or writes `week_start`, so the week boundary matches what the user sees.

### 1. Migration: timezone-aware week_start

Add a tiny SQL helper and update the 4 functions that use `date_trunc('week', CURRENT_DATE)`:

```sql
create or replace function public.app_week_start()
returns date language sql stable as $$
  select (date_trunc('week', (now() at time zone 'Asia/Kolkata')))::date
$$;
```

Replace `(date_trunc('week', CURRENT_DATE))::date` with `public.app_week_start()` in:

- `get_weekly_leaderboard` — both the `wk` CTE filter and the `weekly_seconds` CASE
- `record_question_done`
- `record_questions_done`
- `record_question_undone` (use week of `_completed_at AT TIME ZONE 'Asia/Kolkata'` for the decrement target)
- `record_screen_time` (so `weekly_seconds` also rolls over correctly)
- `reconcile_question_progress` (weekly count threshold)

Also use the IST date for `CURRENT_DATE` comparisons in `register_open` so streak rollover matches what the user sees locally (same timezone consistency).

### 2. Client refresh on week boundary

In `src/hooks/use-weekly-leaderboard.ts` add a small effect that schedules a `fetchRows()` call at the next IST Monday 00:00 so the open dialog/leaderboard repaint immediately at the boundary without requiring a manual refresh.

No table schema changes, no new columns, no UI/component changes required. The dialog and `StreakXPCard` already render `weekly_xp` from the RPC — once the RPC returns the correct value, the "1" becomes "0" in realtime.

## Files touched

- `supabase/migrations/<new>.sql` — helper + 6 function rewrites
- `src/hooks/use-weekly-leaderboard.ts` — schedule a refresh at next IST Monday 00:00

## Why this fixes "realtime"

The leaderboard hook already re-fetches on every `weekly_xp` / `question_progress` change and on local progress events. The stale "1" wasn't a realtime delivery problem — it was the SQL returning last week's row. After the migration the first fetch (on dialog open, on tick, on visibility, or at the scheduled boundary) immediately returns 0.
