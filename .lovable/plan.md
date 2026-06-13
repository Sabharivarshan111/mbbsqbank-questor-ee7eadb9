## Goal

Replace the single "MEDICOS ZONE study material" button (which currently shows Progress + Study Materials side-by-side) with **two separate top-level tab buttons**, mirroring the Essay / Short Notes pattern.

## New Layout

```text
┌─────────────────────────────────────────────┐
│ [ Your Progress ]  [ Study Materials ]      │  ← new top row (replaces single button)
├─────────────────────────────────────────────┤
│ [    Essay    ]    [  Short notes  ]        │  ← existing tabs (unchanged)
├─────────────────────────────────────────────┤
│              <active tab content>           │
└─────────────────────────────────────────────┘
```

- Clicking **Your Progress** → shows only the Progress Dashboard (full width).
- Clicking **Study Materials** → shows only the Google Drive card (full width).
- Clicking **Essay** or **Short notes** → behaves exactly as today.
- Only one of the four is active at a time.

## Files to change

1. **`src/hooks/use-question-bank.ts`**
   - Extend `activeTab` union from `"extras" | "essay" | "short-notes"` to `"progress" | "materials" | "essay" | "short-notes"`.
   - Default remains `"essay"`.

2. **`src/components/QuestionBank.tsx`**
   - Replace the single full-width "MEDICOS ZONE study material" button with a 2-column row of buttons: **Your Progress** and **Study Materials** (same styling treatment as the current extras button, using `getExtraButtonClass()` logic per active state).
   - Replace the single `<TabsContent value="extras">` with two: `value="progress"` (renders `<ProgressDashboard />`) and `value="materials"` (renders the Google Drive card).
   - Update swipe handlers: swipe right from `essay` → cycles through `progress` / `materials`; swipe left from `materials`/`progress` → `essay`. (Keep it intuitive; final order: progress → materials → essay → short-notes.)
   - Hide the inner search bar when either `progress` or `materials` is active (currently hidden only for `extras`).

3. **New: `src/components/question-bank/StudyMaterialsCard.tsx`**
   - Extract the Google Drive card JSX (currently the right column of `ExtrasContent.tsx`) into its own component. Accepts `driveLink` prop.

4. **`src/components/question-bank/ExtrasContent.tsx`**
   - **Delete** (no longer used) — its two halves now live in separate tabs via `ProgressDashboard` (already standalone) and the new `StudyMaterialsCard`.

5. **`src/components/walkthrough/walkthroughSteps.ts`** (only if it references the old `extras-tab-button` selector — will verify and update during build).

## Out of scope

- No changes to Progress Dashboard internals, Supabase logic, leaderboard, or onboarding.
- No styling overhaul — reuse existing `getExtraButtonClass()` / `getTabsListClass()` patterns so blackpink + light/dark themes keep working.
- Google sign-in (separate pending task) is untouched.
