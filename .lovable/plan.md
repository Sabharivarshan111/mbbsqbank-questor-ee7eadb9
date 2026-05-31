## Goal

1. Fix: during the walkthrough, the Pomodoro pill is not visible (it gets hidden / dimmed under the overlay), so the pill-related steps point at nothing.
2. Add a new walkthrough step that explains in detail how to **start** the Pomodoro timer (the play button).

Only the walkthrough + Pomodoro presentation layer is touched. Timer logic, themes, and other features are untouched.

## Root cause of the invisible pill

- The Pomodoro pill renders in a portal with `z-index: 2147483000`.
- The walkthrough overlay container uses `z-index: 2147483600`, and the spotlight `<div>` inside it draws the dim via `box-shadow: 0 0 0 9999px hsl(var(--background) / 0.88)`.
- Because the spotlight `<div>` stacks **above** the pill, the box-shadow paints over the pill area on many devices (especially mobile with a high DPR) before the cutout takes effect, and the spotlight outline appears empty.
- The pill can also be hidden (`isVisible=false` persisted in localStorage from a previous session) on a "first-time" walkthrough trigger, leaving only the small circle button — which has no `data-tour` attribute, so the step's target selector fails entirely.

## Changes

### 1. `src/components/PomodoroTimer.tsx`
- Add `data-tour="pomodoro-pill"` to the mini-circle (hidden state) button container as well, so the selector resolves even when the user previously hid the pill.
- Listen for a `orbit:show-pomodoro` window event and call `setIsVisible(true)` so the walkthrough can force the full pill to appear for the pill / drag / settings / close / start steps.

### 2. `src/components/walkthrough/Walkthrough.tsx`
- Before resolving the target for any step whose id starts with `pomodoro-`, dispatch `window.dispatchEvent(new CustomEvent('orbit:show-pomodoro'))` so the full pill is mounted.
- Raise the spotlight so the pill shows **through** the cutout cleanly:
  - Keep overlay container at `z-index: 2147483600`.
  - Add an explicit dim layer (`position: fixed; inset: 0; background: hsl(var(--background) / 0.88)`) with `clip-path` cutting out the spotlight rect (rounded), instead of relying on `box-shadow` from the spotlight div. This guarantees the pill area is fully un-dimmed.
  - The spotlight outline div stays as a thin ring with transparent background and `pointer-events: auto` (or `none` for `interactive` steps), no box-shadow.
- Keep current behavior for `interactive` (drag) and `action: open-custom-theme` steps.
- On unmount / finish, no extra cleanup needed for the show event (visibility is user-controlled afterwards).

### 3. `src/components/walkthrough/walkthroughSteps.ts`
- Add a new step **before** `pomodoro-drag` (right after `pomodoro-pill`):

```text
id: "pomodoro-start"
title: "Start a Focus Session ▶️"
description: "Tap the round Play button to start the 25-minute focus timer. It will count down and ring when your session is over. Tap the same button (now showing ⏸) to pause, and the ↺ button to reset the current session."
targetSelector: '[data-tour="pomodoro-start"]'
```

### 4. `src/components/pomodoro/TimerControls.tsx`
- Add `data-tour="pomodoro-start"` to the Play / Pause `<Button>` so the new step can spotlight it.

## Out of scope
- No changes to timer engine, settings, themes, AI chat, question bank, or any backend.
- No new dependencies.
- Walkthrough still appears only on first run via the `orbit-walkthrough-completed` localStorage key.