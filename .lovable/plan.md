# Fix: streak stays at 1 instead of growing on consecutive days

## What's wrong

Two issues combine so the streak appears stuck at "1 day":

1. **`register_open` RPC returns the new streak but the client throws away the result.** In `src/hooks/use-profile.ts` we call `supabase.rpc("register_open")` and never read what it returned, and we don't refetch the profile row afterwards. The UI keeps showing the streak from the initial `profiles` SELECT (still `1`) until a realtime UPDATE happens — and on slow / cold-start opens that realtime event often arrives after the user has already closed the app.

2. **Date math in `register_open` is fragile.** The function compares `_last < CURRENT_DATE - INTERVAL '1 day'` (date vs. timestamp). It works in most cases but is brittle around timezone boundaries (server is UTC, users open from IST). A user opening late-evening one day and morning the next can land on a UTC date that doesn't match the `ELSIF _last = CURRENT_DATE - INTERVAL '1 day'` branch cleanly, so the streak silently resets to `1` instead of incrementing to `2`.

Same logic powers every year — fixing it fixes all years.

## Fix

### 1. Tighten `register_open` SQL (migration)

Rewrite the date branches using pure `date` arithmetic and an explicit gap calculation, so the "consecutive day" check is unambiguous:

```sql
_gap := CURRENT_DATE - _last;   -- integer days

IF _last IS NULL OR _gap > 1 THEN
  _streak := 1;
ELSIF _gap = 1 THEN
  _streak := COALESCE(_streak, 0) + 1;
-- _gap = 0 → same day, keep existing streak
END IF;
```

Also guarantee a minimum of `1` when writing back (so a brand-new profile that somehow has `streak = 0` becomes `1` on first open).

### 2. Use the RPC return value in the client

In `src/hooks/use-profile.ts`, in both places we call `register_open` (initial cloud-profile load, and after `saveProfile`):

- Capture the returned `{ streak, last_active_date }`.
- Immediately `setCloud(c => c ? { ...c, streak, last_active_date } : c)` so the dashboard shows the new streak instantly, without waiting on realtime.

### 3. No UI changes required

`ProgressDashboard` already reads `cloud?.streak`, and `StreakXPCard` / `StreakTipsCard` render off that value, so once `cloud.streak` is correct the whole UI (every year) updates.

## Files touched

- `supabase/migrations/<new>.sql` — replace `public.register_open` with the day-gap version.
- `src/hooks/use-profile.ts` — read RPC result and patch `cloud` state in the two `register_open` call sites.

## Out of scope

- XP, leaderboard, and reconciliation logic stay as-is.
- No schema/column changes; `profiles.streak` and `last_active_date` keep their current shape.
