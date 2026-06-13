## Problem

1. When you rename yourself (e.g. "Gg") in Progress, the XP toast on Essay/Short-notes screens still says "Great work, Dr. Sunny!" — the old name.
2. The Leaderboard sometimes keeps showing the old name after a rename.
3. Renaming must keep the same XP, streak and badges (only the label changes).

## Root cause

`useProfile()` is called twice — once in `ProgressDashboard` and once in `GlobalCelebrations` (which feeds the toast). Each call has its own React state. When you save a new name, only the dashboard's copy updates; the global celebration copy keeps the stale name and feeds it to `useXpStream`.

The leaderboard already refetches on `profiles` UPDATE via realtime, and the DB row is the same user id, so XP/streak/badges are automatically preserved on rename. The "old name" feeling in the leaderboard is the same stale-state issue surfacing through the toast plus a missed local refresh when another tab updates the row.

## Fix

1. **Broadcast profile changes across all hook instances**
   - In `src/hooks/use-profile.ts`, after `saveProfile` writes to localStorage + DB, dispatch a `window` `CustomEvent("orbit-profile-changed", { detail: profile })`.
   - Every `useProfile()` instance listens for that event (and the existing `storage` event) and updates its own `local` state. Result: `GlobalCelebrations` immediately sees the new `display_name`.
   - Also subscribe to the user's own `profiles` row via realtime inside `useProfile` so cloud-side name changes (other device) propagate too.

2. **Always pass the freshest name to the toast**
   - In `src/hooks/use-xp-stream.ts`, read `displayName` via a `ref` that is updated whenever the prop changes, so the toast text uses the current name even if the closure was created earlier.

3. **Confirm rename keeps progress**
   - `saveProfile` already does `upsert({ id, display_name, year })` without touching `xp`/`streak`/badges. No change needed — call this out so the user knows badges/XP/streak survive the rename. The on-device badge unlocks live in `localStorage` (`orbit-rewards-v1`) keyed by badge id, not by name, so they also survive.

4. **Leaderboard freshness**
   - No schema change. `useWeeklyLeaderboard` and `useLeaderboard` already refetch on `profiles` UPDATE. Verified `profiles` is in the `supabase_realtime` publication. The fix in step 1 also ensures the *current user's* row in the local leaderboard render updates instantly (since `currentUserId` highlight and "(you)" badge rely on the same profile state).

## Files to edit

- `src/hooks/use-profile.ts` — dispatch + listen for `orbit-profile-changed`, add realtime subscription on own profile row.
- `src/hooks/use-xp-stream.ts` — keep `displayName` in a ref so toast copy is always current.

No DB migration, no new components, no change to XP/streak/badge logic.
