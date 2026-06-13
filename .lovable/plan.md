# Weekly Leaderboard, Global Celebrations & XP Tips

## 1. Weekly leaderboard (new) + Lifetime tab

**Database (migration):**
- New table `public.weekly_xp` to track XP earned per ISO week per user:
  - `user_id uuid`, `week_start date` (Monday), `xp int default 0`, `streak_snapshot int default 0`
  - PK: `(user_id, week_start)`
  - RLS: authenticated read all (for leaderboard), users update only their own row via RPC
  - GRANTs + enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_xp;`
- Update `public.record_question_done` RPC: also `INSERT … ON CONFLICT` into `weekly_xp` for the current week (`date_trunc('week', CURRENT_DATE)`), incrementing `xp` by 1.
- New RPC `get_weekly_leaderboard(_year, _limit)` returns top users for current week joined with `profiles` (display_name, year, streak, xp lifetime) so a single query feeds the UI.

**Frontend `Leaderboard.tsx`:**
- Add a second tabs row: `Weekly | Lifetime` (in addition to existing `My Year | Global`).
- Weekly mode: query `weekly_xp` joined with `profiles`; show `weekly XP`, lifetime XP small, streak flame, and a tiny **badge chip** (highest XP badge from `rewards.ts`, e.g. 🥇 Gold Scholar) next to the name.
- Lifetime mode: existing behavior, but also render badge chip + streak.
- Realtime: subscribe to both `profiles` and `weekly_xp` channels; refetch on change.
- Add a small countdown "Resets in 3d 4h" header to the weekly tab (computed client-side until next Monday 00:00 UTC).

## 2. Tips card — split XP tips and Streak tips

Refactor `StreakTipsCard.tsx` into two stacked compact rows inside one card:
- **Earn more XP** — rotating contextual tip ("Finish 5 MCQs for +5 XP", "Open any Essay topic and mark a question done", "Hit Level X with N more XP").
- **Grow your streak** — ("Open the app daily — even 1 question keeps it alive", "Streak resets after 48h of inactivity", "Reach 7 days for the Blaze badge 🔥").
Each row uses its own icon (Zap for XP, Flame for streak) and theme-aware accent.

## 3. Global congratulations (everywhere, not only Progress tab)

Move the celebration listener up to the app root so toasts + confetti fire on **any** screen (Essay, Short Notes, Home, etc.).

- Promote `useXpStream` + `CelebrationOverlay` into a new `<GlobalCelebrations />` component mounted once inside `App.tsx`.
- Remove the duplicate mount from `ProgressDashboard.tsx` (single source of truth so we don't double-fire).
- Add Essay/Short-Notes-specific milestone messages: when XP increment happens while user is on an essay/short-notes route, toast copy switches to "🎉 +1 XP — keep crushing those essays!" / "📝 Short note done — +1 XP".
- Home-screen specific: when a streak milestone or level-up fires, the celebration overlay shows on whatever screen the user is on (it's a fixed-position modal already).

## 4. Realtime everywhere

- Leaderboard (both tabs) already uses `postgres_changes` — extend to `weekly_xp`.
- `useXpStream` already subscribes to `profiles` row updates — keep.
- Ensure `weekly_xp` is added to the realtime publication in the migration.

## Files

**Migration (1):** create `weekly_xp` + grants + RLS + realtime, update `record_question_done`, add `get_weekly_leaderboard` RPC.

**New:**
- `src/components/GlobalCelebrations.tsx`
- `src/hooks/use-weekly-leaderboard.ts`

**Edit:**
- `src/App.tsx` — mount `<GlobalCelebrations />`
- `src/components/progress/Leaderboard.tsx` — Weekly/Lifetime tabs, badge chip, streak
- `src/components/progress/ProgressDashboard.tsx` — remove local celebration mount
- `src/components/progress/StreakTipsCard.tsx` — split into XP + Streak tip rows
- `src/hooks/use-xp-stream.ts` — route-aware toast copy

## Out of scope
- No new visual themes / gradients (kept from previous pass).
- No badge schema changes — badges remain client-side from `rewards.ts`.
