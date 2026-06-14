## 1. Tap a leaderboard entry → user details + head-to-head

In `src/components/progress/Leaderboard.tsx` each row becomes a button that opens a new `UserStatsDialog` (`src/components/progress/UserStatsDialog.tsx`).

Dialog content for the tapped user:
- Avatar circle (initials) + display name + year badge
- Highest XP badge earned (from `XP_BADGES` in `src/lib/rewards.ts`) with name + emoji, plus next-badge progress bar
- Stat tiles: Lifetime XP, This-week XP, Current streak, Questions solved (= `xp`, since `record_question_done` grants 1 XP per unique question — already accurate)
- "You vs. Dr. {name}" comparison block:
  - Side-by-side numbers for XP / weekly XP / streak / questions solved
  - Delta line: e.g. "You're 42 XP behind — solve 42 more questions to tie, 43 to overtake" (or "ahead by N" when current user leads)
  - If they lead on streak: "Open the app daily for N more days to match their streak"
- Encouragement footer line based on gap (small/medium/large)

Data: everything needed is already in the leaderboard row (`xp`, `weekly_xp`, `streak`, `year`, `display_name`). Current user's stats come from the same `rows` array (find by `currentUserId`) — no new query, no RLS work, stays realtime.

Self-tap: dialog shows "This is you" header and skips the comparison block.

## 2. First-run walkthrough revamp

Edit `src/components/walkthrough/walkthroughSteps.ts` and `src/components/walkthrough/Walkthrough.tsx`.

New ordered steps inserted at the very top, before the existing "qbank" step:

1. **Welcome + Set up your profile** — replaces the current plain "welcome" step. Renders the onboarding form inline inside the walkthrough card (name + year, same fields as `OnboardingDialog`). Saving calls `saveProfile` from `useProfile`; Skip is allowed. This requires a new `step.component` escape hatch in `Walkthrough.tsx` so a step can render custom JSX instead of just title/description.
2. **Your Progress tab** — points to the Progress tab trigger, explains it's where stats, streaks and leaderboard live. New `data-tour="progress-tab"` on the Progress `TabsTrigger` in `QuestionBank.tsx`.
3. **XP & Streaks** — targets the StreakXPCard (`data-tour="streak-xp-card"` added). Explains: +1 XP per unique question solved, daily open keeps streak alive, badges unlock at XP milestones.
4. **Ranking & Stats** — targets RewardsShelf/badges (`data-tour="rewards-shelf"`). Explains badge tiers and how progress is tracked.
5. **Leaderboard** — targets the Leaderboard card (`data-tour="leaderboard"`). Explains weekly vs lifetime, tap any name to see their stats and how to beat them.

Then the existing flow continues (QBank header, AI chat, themes, pomodoro, report-issue, etc.) unchanged in order.

Walkthrough auto-switches the active tab to "Your Progress" before steps 2–5 fire and switches back to "Question Bank" for the qbank step. Implemented by extending the `action` union in `walkthroughSteps.ts` with `open-progress-tab` / `open-qbank-tab` and handling them in `Walkthrough.tsx` via a `window` CustomEvent that `QuestionBank.tsx` listens for to call `setTab(...)`.

## 3. Study Materials walkthrough step (rename cleanup)

There is no current step that mentions "Medicoz" — the Question Bank tab was already renamed to "Study Materials" in `QuestionBank.tsx` (line 133) and `StudyMaterialsCard.tsx`. To match the user's intent, add one new walkthrough step right after the qbank step:

- **Study Materials** — targets `data-tour="study-materials-tab"` (added to the Study Materials `TabsTrigger`). Copy: "Tap here for curated notes, PDFs and reference material for every subject." Switches to that tab via `open-study-materials-tab` action.

Also grep the codebase for any stray "Medicoz" string and remove it if found (none expected based on current search).

## Technical details

Files created:
- `src/components/progress/UserStatsDialog.tsx`

Files edited:
- `src/components/progress/Leaderboard.tsx` — rows become buttons, manage selected-user state, render dialog
- `src/components/walkthrough/walkthroughSteps.ts` — new steps, new action types, optional `component` field
- `src/components/walkthrough/Walkthrough.tsx` — handle `component` rendering, dispatch tab-switch events, handle profile-setup step's Save/Skip
- `src/components/QuestionBank.tsx` — add `data-tour` attrs (`progress-tab`, `study-materials-tab`), listen for tab-switch CustomEvents
- `src/components/progress/ProgressDashboard.tsx` — add `data-tour` wrappers on `StreakXPCard`, `RewardsShelf`, `Leaderboard`

No database migration. No RLS changes. No new dependencies. Realtime continues to work because the dialog reads from the same `rows` array driven by the existing realtime subscription.
