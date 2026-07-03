## Goal
When the user expands any year accordion (First Year, Second Year, etc.) in the Question Bank, the floating Pomodoro timer should auto-minimize so it doesn't overlap the content.

## Change
Single file: `src/components/question-bank/QuestionBankContent.tsx`

Wrap the Accordion's `onValueChange` so that when the expanded list grows (a year was just opened), it dispatches the existing `orbit:hide-pomodoro` event before updating state.

```tsx
onValueChange={(next) => {
  if (next.length > localExpandedItems.length) {
    window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
  }
  setLocalExpandedItems(next);
}}
```

## Why this works
- `PomodoroTimer.tsx` already listens for `orbit:hide-pomodoro` and collapses to the mini pill.
- Same mechanism already used when switching to Progress/Materials tabs — consistent behavior.
- Only fires on expand, not collapse, so closing a year won't re-trigger anything.
- No new state, no new deps.
