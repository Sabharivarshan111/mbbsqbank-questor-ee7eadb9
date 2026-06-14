## 1. Per-year ranking (year-scoped XP & weekly XP)

Today every user has a single `profiles.xp` and `weekly_xp.xp`. Switching year in the profile just relabels the same numbers, so a Third Year and First Year user share the same ranking pool. We will scope XP to the year each question was earned in.

### Schema migration

Add a nullable `year text` column to:
- `public.question_progress` — the year the user was studying when they completed it
- `public.weekly_xp` — included in the unique key so weekly XP buckets per (user, week, year)
- `public.daily_activity` — for future per-year analytics

Backfill: existing rows get the user's current `profiles.year` value (one-shot UPDATE in the migration).

Drop the existing primary key on `weekly_xp(user_id, week_start)` and recreate it as `(user_id, week_start, year)` so the same user studying two years in one week is tracked separately.

### Function changes

- `record_question_done(_question_id)` — read the caller's `profiles.year`, insert it into `question_progress.year`, and bump `weekly_xp` for that (user, week, year).
- New RPC `get_year_lifetime_xp(_user_id uuid, _year text)` — returns `COUNT(*)` from `question_progress` for that user+year. Used by the dashboard.
- Replace `get_weekly_leaderboard(_year, _limit)` with a year-aware version: when `_year` is given, rank by SUM(weekly_xp.xp) for that year only; when null, rank by total weekly XP across years. Join to a CTE that computes per-year lifetime XP from `question_progress` so the row carries `weekly_xp`, `year_lifetime_xp`, and `lifetime_xp`.
- New RPC `get_year_leaderboard(_year, _limit)` — ranks `question_progress` counts grouped by user for that year, joined to `profiles` for name/streak. Used by lifetime tab when scope = "My Year".

Streak stays global (one continuous app-usage habit per user — does not split by year).

### Client changes

- `src/components/progress/StreakXPCard.tsx` — show the year-scoped XP for the user's current year as the primary number, with "Lifetime: N" as a small subtitle. Streak unchanged.
- `src/components/progress/YearRingCard.tsx` — already filters by year; unchanged.
- `src/hooks/use-leaderboard.ts` — when `filterYear !== "all"` use `get_year_leaderboard` RPC; when "all", keep current lifetime-by-profiles.xp query.
- `src/hooks/use-weekly-leaderboard.ts` — pass `_year` exactly as today; the updated RPC handles the split.
- `src/components/progress/UserStatsDialog.tsx` — show "Year XP" and "Lifetime XP" as separate stat tiles; comparison block uses year XP when both users are in the same year, otherwise falls back to lifetime.
- `src/hooks/use-profile.ts` — when the user changes their year via Edit Profile, do NOT touch XP/streak, but fetch the new year's stats afterward so the dashboard re-renders correctly.

Result: switching from Third Year to First Year shows that user's First Year XP (which may be 0) and ranks them on the First Year leaderboard only.

## 2. Fix duplicate users on the leaderboard

Root cause: every call to `supabase.auth.signInAnonymously()` creates a new auth user + profile row. If the Supabase auth localStorage entry is ever cleared (uninstall/reinstall, "clear app data", private mode, switching browsers), the next save creates a brand-new profile with the same display name — leaving the old profile orphaned but still showing on the leaderboard.

### Fixes

1. **Device fingerprint column.** Add `device_id text` to `profiles` (nullable). On every `saveProfile`, generate/persist a UUID in `localStorage.orbit-device-id` and write it to the profile.
2. **Reclaim on save.** New RPC `claim_or_merge_profile(_device_id text, _display_name text, _year text)`:
   - If a profile with the same `device_id` already exists (from a previous anonymous session on this device) and the current user is different, MOVE all `question_progress`, `weekly_xp`, and `daily_activity` rows from the old user to the current user (ON CONFLICT add), recompute `profiles.xp` = COUNT(question_progress), then DELETE the old profile.
   - Always upsert the current profile with the new name/year/device_id.
   - Returns the merged profile row.
3. **`saveProfile` calls the new RPC** instead of plain upsert, so the moment a returning user sets their name the duplicate disappears and their previous XP/streak/badges follow them.
4. **Client-side dedupe as a safety net.** In `Leaderboard.tsx`, after fetching rows, dedupe by `lowercase(display_name).trim()` keeping the highest-XP row. Belt-and-braces for any duplicates that exist before the merge RPC runs.
5. **One-shot cleanup migration.** For existing data: for each `(lower(display_name), year)` group with >1 profile, keep the row with highest XP and delete the rest after moving their `question_progress` rows over. Logged as part of the migration so it is auditable.

## 3. Profanity & body-shaming filter for display name

New file `src/lib/profanity.ts` exporting `validateDisplayName(name: string): { ok: boolean; reason?: string }`.

Implementation:
- Curated word list covering English + Tamil + Telugu + Malayalam + Hindi (transliterated and native scripts) — slurs, sexual terms, body-shaming words. Stored as a TS array of lowercased strings, grouped by language in comments for easy maintenance.
- Normalize the input: trim → toLowerCase → strip diacritics → collapse repeats (`aaass` → `as`) → strip common leet substitutions (`@`→`a`, `0`→`o`, `1`→`i`, `3`→`e`, `5`→`s`, `$`→`s`) → strip non-alphanumerics.
- Match against the list with word-boundary regex (so "Assam" doesn't trip "ass"); for the native-script entries use substring match because word boundaries don't work cleanly for Indic scripts.
- Also reject names that are entirely emojis/punctuation, exceed 40 chars, or are blank.

### Where it's enforced
- `src/components/progress/OnboardingDialog.tsx` — call `validateDisplayName` on Save; on failure show a toast "Please choose a respectful name — no slurs, hate speech or body-shaming words" and keep the dialog open.
- `src/components/walkthrough/WalkthroughProfileSetup.tsx` — same validation before `saveProfile`.
- `src/hooks/use-profile.ts` — also gate inside `saveProfile` so any future call site is protected; throw a typed error the UI can surface.

No DB-level CHECK (not feasible for multilingual matching). Validation is purely client-side because all writes go through `saveProfile`.

## Technical details

### Files created
- `supabase/migrations/<timestamp>_year_scoped_xp_and_dedupe.sql` — schema + RPC changes + backfill + dedupe cleanup
- `src/lib/profanity.ts`

### Files edited
- `src/hooks/use-profile.ts` — device_id, call `claim_or_merge_profile`, validate name
- `src/hooks/use-leaderboard.ts` — call `get_year_leaderboard` for year scope
- `src/hooks/use-weekly-leaderboard.ts` — handle new RPC response shape
- `src/components/progress/Leaderboard.tsx` — dedupe rows by display_name
- `src/components/progress/StreakXPCard.tsx` — show year XP + lifetime XP
- `src/components/progress/UserStatsDialog.tsx` — year XP tile + same-year-aware comparison
- `src/components/progress/ProgressDashboard.tsx` — fetch year XP for current year and pass down
- `src/components/progress/OnboardingDialog.tsx` — name validation + toast
- `src/components/walkthrough/WalkthroughProfileSetup.tsx` — same validation + inline error

### Out of scope
- Server-side profanity filter via Edge Function (not requested; client validation is the contract).
- Splitting streaks per year.
- Real-name verification.
