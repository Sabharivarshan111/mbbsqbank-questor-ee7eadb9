# Plan: Google Sign-In + Animations + Unified Top Tabs

## 1. Unify "Your Progress" + "Study Materials" into a single TabsList (with gradient)

Currently they are two separate `<button>` elements in a `grid grid-cols-2`. Refactor `src/components/QuestionBank.tsx` so they live inside a single `<Tabs>` + `<TabsList>` block (same pattern as Essay / Short notes), with:

- One `TabsList` containing two `TabsTrigger`s: `progress` and `materials`.
- The active trigger gets a gradient background (e.g. `bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white shadow-lg`); inactive stays muted. Blackpink theme uses pink→black gradient.
- Same `getTabsListClass()` container styling as the Essay row for visual consistency.
- Keep the existing swipe `ORDER` (`progress → materials → essay → short-notes`) and `isTopTab` search-bar hiding logic intact.

Below the top TabsList stays the existing Essay / Short notes TabsList unchanged.

## 2. Add Google Sign-In to "Your Progress"

Create `src/components/progress/GoogleSyncButton.tsx`:
- If session is anonymous → button "Sync with Google" → calls `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- If already linked (non-anonymous) → shows "✓ Synced as <email>" + small "Sign out" link.
- Uses official Google "G" SVG icon + subtle gradient border.
- Shows toast on error (e.g. provider not configured).

Extend `src/hooks/use-profile.ts` to expose `isAnonymous`, `email`, and `signOut()`.

Mount the button inside `ProgressDashboard.tsx` directly under the "Dr. {name}" header row, so it sits at the top of the Your Progress view.

User must enable Google provider in Supabase dashboard (one-time setup, ~5 min — Google Cloud OAuth client + paste Client ID/Secret into Supabase). The button shows a friendly error until then; anonymous sync keeps working.

## 3. Cool animations in Your Progress

Use existing Tailwind utilities (`animate-fade-in`, `animate-scale-in`, `hover-scale`) plus a few new touches — no new libraries:

- **YearRingCard**: animate the progress ring stroke from 0 → target on mount (CSS transition on `strokeDasharray`, triggered via `useEffect`). Numbers count up using a small `useCountUp` hook (rAF, ~600ms).
- **StreakXPCard**: XP bar fills with a smooth width transition; flame icon gets a gentle `animate-pulse` when streak > 0; badge unlock uses `animate-scale-in`.
- **SubjectsList**: each subject row fades/slides in with staggered delay (`style={{ animationDelay: i*60+'ms' }}` + `animate-fade-in`); progress bars animate width on mount.
- **Leaderboard**: rows `animate-fade-in` staggered; the current-user row gets a soft glowing ring (`ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.4)]`).
- **ProgressDashboard wrapper**: top-level `animate-fade-in` when the tab opens.

Add one small helper `src/hooks/use-count-up.ts` for animated numbers.

## Out of scope
- Supabase schema / RLS / edge functions — untouched.
- Essay / Short notes content or question-bank data — untouched.
- No new animation libraries (framer-motion not needed for this scope).

## Technical notes
- Files created: `src/components/progress/GoogleSyncButton.tsx`, `src/hooks/use-count-up.ts`.
- Files edited: `src/components/QuestionBank.tsx`, `src/components/progress/ProgressDashboard.tsx`, `src/components/progress/YearRingCard.tsx`, `src/components/progress/StreakXPCard.tsx`, `src/components/progress/SubjectsList.tsx`, `src/components/progress/Leaderboard.tsx`, `src/hooks/use-profile.ts`.
- Gradient tokens reuse Tailwind palette directly so light/dark/blackpink themes all look correct.
