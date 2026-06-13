# Plan: Progress Dashboard + Cloud Leaderboard

## 1. Split the "Extras" panel into two halves

In `ExtrasContent.tsx`, replace the single centered card with a responsive 2-column grid (stacked on mobile, side-by-side on `md:` and up):

```text
┌──────────────────────┬──────────────────────┐
│   Your Progress      │   Study Materials    │
│   (new dashboard)    │   (existing Drive)   │
└──────────────────────┴──────────────────────┘
```

- **Left half** → new `<ProgressDashboard />` component
- **Right half** → existing Drive button block, header renamed from "MEDICOS ZONE study material" to **"Study Materials"**

## 2. First-run onboarding (local)

Tiny modal shown when no profile exists in `localStorage`:

- Input: **Display name** ("Dr. ___")
- Select: **Year** — 1st / 2nd / 3rd / Final
- Stored in `localStorage` AND mirrored to a `profiles` row in Supabase
- "Edit profile" pencil in the dashboard header to change name/year later

## 3. Progress Dashboard (left half) — mirrors the reference screenshot

Card 1 — **"YOUR YEAR"** hero:
- Big circular ring (existing `Progress` ring style / SVG circle) showing **% done**
- Below ring: **Completed | Remaining | Total** counts with colored numbers
- Source: counts derived from existing `collectQuestions` + `countDone` in `src/lib/question-progress.ts`, scoped to the user's selected year's subjects (uses existing `questionBankData`)
- Updates live via existing `QUESTION_PROGRESS_EVENT` (already dispatched whenever a checkbox toggles in essay/short-notes — no changes needed to the tick logic)

Card 2 — **SUBJECTS** list:
- One row per subject in the user's year, each with:
  - Subject icon (reuse subject's existing icon/color), title, `done / total questions`, `%`
  - Horizontal progress bar (using existing `Progress` component)
- Expand chevron → optional drill-down later (not in this scope)

Card 3 — **Streaks & XP**:
- 🔥 Daily streak counter (increments once per calendar day on app open; resets if a day is missed)
- Level + XP bar (XP = total completed questions; level = `floor(xp/50)+1`)
- Badge row (locked/unlocked): 10, 50, 100, 500 questions

Card 4 — **Leaderboard** (real-time, 2 tabs):
- Tab "My Year" / Tab "Global"
- Rows: rank, display name, year chip, `🔥streak`, XP
- Current user row highlighted; shows "You are #N this week"

## 4. Cloud backend (Lovable Cloud / Supabase)

Anonymous auth: on first launch, call `supabase.auth.signInAnonymously()` after the user submits name + year. No password, zero friction.

New tables (created via migration with proper GRANTs + RLS):

- **`profiles`** — `id` (=auth.uid), `display_name`, `year` (`first|second|third|final`), `xp`, `streak`, `last_active_date`, timestamps
  - RLS: anyone authenticated can `SELECT` (needed for leaderboard); user can only `UPDATE`/`INSERT` their own row
- **`question_progress`** — `user_id`, `question_id`, `completed_at`, unique(user_id, question_id)
  - RLS: user can read/write only their own rows
  - Used for cross-device sync; localStorage stays as the offline-first cache, synced on auth ready
- **`daily_activity`** — `user_id`, `date`, `opens`, `questions_done`
  - RLS: same as above; powers weekly leaderboard

Sync strategy:
- Local `setQuestionDone` already exists. Wrap it so it also upserts to `question_progress` (fire-and-forget) and increments `profiles.xp` + `daily_activity` via a single RPC `record_question_done(question_id)`.
- On app load: pull `question_progress` for the user, merge into localStorage, then emit `QUESTION_PROGRESS_EVENT` so all existing UI re-renders with synced state.
- On app load: RPC `register_open()` updates `last_active_date`, recomputes streak, increments today's `daily_activity.opens`.

Realtime leaderboard:
- Subscribe to `postgres_changes` on `profiles` (xp/streak updates) inside `useEffect` with cleanup (`removeChannel`).
- Query: `SELECT * FROM profiles ORDER BY xp DESC LIMIT 50` (+ filter by year for "My Year" tab).

Weekly top-3:
- View `weekly_leaders` = sum of `daily_activity.questions_done` over last 7 days, top 3.

## 5. Rewards UX

- Toast + confetti when a badge unlocks
- Toast "🔥 Streak: N days" once per day on first open
- Subtle pulse on the leaderboard row when your rank improves

## 6. Out of scope (future)

- Real-time multiplayer quiz games
- Friend invites / private groups
- Push notifications for streak reminders

---

## Technical sections

### New / changed files
- `src/components/question-bank/ExtrasContent.tsx` — split layout
- `src/components/progress/ProgressDashboard.tsx` (new) — composes cards
- `src/components/progress/YearRingCard.tsx` (new)
- `src/components/progress/SubjectsList.tsx` (new)
- `src/components/progress/StreakXPCard.tsx` (new)
- `src/components/progress/Leaderboard.tsx` (new, with Realtime subscription)
- `src/components/progress/OnboardingDialog.tsx` (new)
- `src/hooks/use-profile.ts` (new) — local + cloud profile, anon auth bootstrap
- `src/hooks/use-leaderboard.ts` (new) — fetch + realtime
- `src/lib/question-progress.ts` — augment `setQuestionDone` to also call RPC when signed in (existing local behavior unchanged for offline)
- `src/lib/year-subjects.ts` (new) — maps year → subject keys in `questionBankData`

### Migration (single call, includes GRANTs)
- Create `app_year` enum, `profiles`, `question_progress`, `daily_activity` tables
- RLS policies as described above
- RPCs `record_question_done(text)` and `register_open()` (SECURITY DEFINER, search_path=public)
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;`

### Auth
- Anonymous sign-in on first profile submit; session persists. Existing `study_presence` table untouched.
