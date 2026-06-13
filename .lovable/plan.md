# Progress Area Gamification & Polish

Make the Progress tab feel like a premium game: real-time celebrations for every XP gain and streak milestone, contextual tips to grow the streak, theme-aware gradients on the top tabs, and a richer reward system with unlockable badges/cards.

## 1. Real-time XP & Streak notifications

- Subscribe to `question_progress` events (already dispatched via `QUESTION_PROGRESS_EVENT`) and to Supabase realtime on the `profiles` row for the current user.
- On every XP change:
  - Sonner toast: "+1 XP · Great work, Dr. {name}!" with a gradient accent.
  - Floating "+1 XP" number that rises and fades over the StreakXP card.
  - Confetti burst (lightweight, canvas-based, no heavy lib) when XP crosses a level (every 50 XP) or a badge threshold (10 / 50 / 100 / 500).
- On streak increase:
  - Toast: "🔥 {n}-day streak! Keep the flame alive."
  - Flame icon pulses + scales once; subtle screen-edge glow.
  - Milestones (3, 7, 14, 30, 60, 100 days) trigger a full celebration modal with confetti and a shareable "Streak card".

## 2. Streak & XP growth tips

Add a small "How to grow" card under StreakXP with rotating, dismissible tips:
- "Answer 1 question a day to keep your streak alive."
- "Hit Level {next} with just {n} more XP."
- "Complete a full subtopic for a 10-XP bonus." (future)
- "Open the app daily — even a single question counts."

Card shows the most actionable tip first (computed from current state: low streak → streak tip; near level-up → XP tip; near badge → badge tip).

## 3. Themed gradients on top tabs (Your Progress / Study Materials)

Currently both top tabs use the same fuchsia→pink→orange gradient regardless of theme. Make the active-tab gradient match the current theme, mirroring how Essay / Short notes already adapt:

- light / dark: fuchsia → pink → orange (current)
- blackpink: hot pink → black (current variant, keep)
- Add per-theme gradients for any other themes defined in `ThemeProvider` (e.g. ocean → teal/blue, sunset → amber/red, forest → emerald/lime). I'll read `ThemeProvider.tsx` to enumerate themes and define a gradient map in one place (`src/lib/theme-gradients.ts`) reused by both the top tab row and the StreakXP progress bar / badges so the whole Progress area feels cohesive per theme.

## 4. Luxurious animations across Progress area

- `YearRingCard`: animated SVG ring that sweeps from 0 → current % on mount with easing, soft inner glow, count-up percentage.
- `StreakXPCard`: shimmer sweep across the XP bar, badge unlock = scale-in + glow pulse, locked badges get a subtle "shimmer on hover" tease.
- `SubjectsList`: stagger fade-in rows, per-row gradient progress with sheen.
- `Leaderboard`: gold/silver/bronze gradient rows for top 3, crown icon for #1, subtle row hover lift.
- Use existing tailwind keyframes (`fade-in`, `scale-in`) + add `shimmer` and `float-up` keyframes in `tailwind.config.ts` / `index.css`.

## 5. Reward & badge system (video-game style)

Extend the current 4-badge strip into a proper rewards shelf:

- Tiered badges with icons: Bronze (10), Silver (50), Gold (100), Platinum (250), Diamond (500), Legendary (1000).
- Streak badges: 🔥3, 🔥7, 🔥14, 🔥30, 🔥100.
- Each unlock fires confetti + toast + writes to `localStorage` (`orbit-rewards-v1`) so the celebration only plays once.
- New "Rewards" collapsible section showing all badges with locked/unlocked states, progress-to-next, and unlock date.
- Optional: "Daily login bonus" — first open of the day gives +2 XP with a small chest-open animation.

All purely client-side; no schema changes required (XP / streak already exist on `profiles`).

## Out of scope

- Backend leaderboard ranking changes.
- Push notifications outside the app.
- New Supabase tables.

## Technical details

**Files to create**
- `src/lib/theme-gradients.ts` — map theme → gradient class strings.
- `src/lib/rewards.ts` — badge definitions, unlock detection, localStorage tracking.
- `src/components/progress/RewardsShelf.tsx`
- `src/components/progress/StreakTipsCard.tsx`
- `src/components/progress/CelebrationOverlay.tsx` — confetti + modal for milestones.
- `src/hooks/use-xp-stream.ts` — subscribes to `QUESTION_PROGRESS_EVENT` + Supabase realtime on `profiles`, emits `{ deltaXp, newXp, newStreak, unlocked }`.
- `src/hooks/use-floating-number.ts` — small util for "+1 XP" floats.

**Files to edit**
- `src/components/QuestionBank.tsx` — `topTriggerClass` reads from `theme-gradients.ts`.
- `src/components/progress/ProgressDashboard.tsx` — mount `useXpStream`, render `RewardsShelf`, `StreakTipsCard`, `CelebrationOverlay`.
- `src/components/progress/StreakXPCard.tsx` — shimmer, floating-number anchor, themed gradient.
- `src/components/progress/YearRingCard.tsx` — animated ring + count-up.
- `src/components/progress/Leaderboard.tsx` — top-3 styling.
- `src/components/progress/SubjectsList.tsx` — stagger + sheen.
- `tailwind.config.ts` + `src/index.css` — `shimmer`, `float-up`, `ring-fill` keyframes; gradient utility tokens.

**Confetti**: tiny custom canvas implementation (~60 lines) in `CelebrationOverlay.tsx` — no new dependency.

**Realtime**: `supabase.channel('profile:'+userId).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.'+userId }, ...)`. Falls back to polling the existing `QUESTION_PROGRESS_EVENT` if realtime is disabled.

**Once-only celebrations**: `localStorage['orbit-rewards-v1'] = { unlockedBadges: [...], lastLevel, lastStreakMilestone }` — compared on every update to decide whether to fire confetti.
