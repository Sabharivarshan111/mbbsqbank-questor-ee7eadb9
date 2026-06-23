## Goal

Improve the leaderboard's "not signed in" state so users clearly understand they need to sign in, and add Android-specific instructions for getting Google Sign-In to work (with a Play Store link + fallback search instruction). Website users should not see the Android troubleshooting.

## Scope

Only `src/components/progress/Leaderboard.tsx` (the `!enabled` empty state).

## Changes

**`src/components/progress/Leaderboard.tsx` — replace the `!enabled` block (lines 152-159) with a richer card:**

1. Heading: "Sign in required for Leaderboard" with the Trophy icon.
2. Sub-text: "Set your name and sign in above to join the weekly and lifetime rankings."
3. Detect Android using `/Android/i.test(navigator.userAgent)` (memoized once). Only when true, render an additional info block:
   - "Using the Android app? If Google Sign-In isn't working, please update Orbit MBBS to the latest version on the Play Store."
   - A primary button linking to `https://play.google.com/store/apps/details?id=com.aistudio.mbbsqbank.aycxvd` (opens in new tab, `rel="noopener noreferrer"`).
   - Small helper line: "If the link doesn't open, search 'Orbit MBBS' in the Play Store and update the app."
4. Web/desktop/iOS users see only the sign-in message — no Play Store block (per the user's instruction).

Styling stays consistent with existing card tokens (`bg-card`, `border`, `rounded-2xl`, muted-foreground text, primary button). No new dependencies.

## Out of scope

- No changes to auth flow, hooks, or DB.
- No changes to other screens.
