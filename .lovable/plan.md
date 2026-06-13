## Goal

Replace the single "MEDICOS ZONE study material" button at the top of the Question Bank with **two side-by-side buttons**: **Your Progress** and **Study Materials**. Each opens its own dedicated page. The Essay / Short Notes tabs stay below, unchanged.

## Layout

```text
┌─────────────────────────────────────────────┐
│  [ Your Progress ]   [ Study Materials ]    │  ← new 2-button row (replaces current single button)
├─────────────────────────────────────────────┤
│  [   Essay   ]   [  Short notes  ]          │  ← unchanged
└─────────────────────────────────────────────┘
```

- Active button gets the highlighted style (currently used for the single Extras button); inactive gets the muted style.
- When either top button is active, Essay/Short Notes tabs and search bar are hidden (same as today's Extras behavior).
- Swipe gestures updated: swiping cycles `progress → materials → essay → short-notes`.

## Page contents

- **Your Progress page** — renders `<ProgressDashboard />` full-width (no longer in a 2-column grid).
- **Study Materials page** — the centered card with the "Open Google Drive" button (extracted from current `ExtrasContent.tsx`).

## Files to change

1. **`src/hooks/use-question-bank.ts`** — extend `activeTab` union from `"extras" | "essay" | "short-notes"` to `"progress" | "materials" | "essay" | "short-notes"`. Default to `"essay"`.
2. **`src/components/QuestionBank.tsx`**
   - Replace the single Extras button with a 2-column grid of two buttons (Progress, Study Materials), each wired to set `activeTab`.
   - Remove the old `ExtrasContent` import; add two new `<TabsContent>` panels: `progress` and `materials`.
   - Update swipe handler order.
   - Update `activeTab !== "extras"` guard → `activeTab !== "progress" && activeTab !== "materials"` for the search bar.
3. **`src/components/question-bank/ProgressPage.tsx`** (new) — thin wrapper that renders `<ProgressDashboard />` in a single full-width column with the same outer card styling.
4. **`src/components/question-bank/StudyMaterialsPage.tsx`** (new) — the centered Google Drive card (lifted from current `ExtrasContent.tsx`).
5. **`src/components/question-bank/ExtrasContent.tsx`** — delete (no longer referenced) OR leave as-is unused. Plan: delete to avoid dead code.

## Button labels

User didn't specify, so defaults will be **"Your Progress"** and **"Study Materials"** (matches the existing in-app wording). Easy to rename later.

## Out of scope

- No changes to `ProgressDashboard` internals, leaderboard, profile, or Google sign-in work.
- No styling overhaul — both new buttons reuse the existing `getExtraButtonClass()` style (active/inactive variants), just rendered twice in a 2-column grid.
