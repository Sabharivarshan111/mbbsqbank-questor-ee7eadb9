## Goal

Make the Pomodoro settings sheet actually push the user's custom durations (e.g. Focus 40 min) into the running timer display, by reworking the two bottom action buttons.

## Root cause

In `usePomodoroTimer`, the effect that syncs `focusMinutes/shortMinutes/longMinutes` into the visible timer only runs when `!isRunning && !isEditing`. If the timer was ever started (or is mid-edit), changing sliders updates saved settings but the on-screen `25:00` never refreshes — which matches what the user sees (set 40 min, timer still shows 25:00).

The user's fix: give them an explicit "Set this configuration" button that force-applies current settings to the timer, and relabel the other button to "Reset pomodoro cycle".

## Changes

### 1. `src/hooks/use-pomodoro-timer.ts`
Expose a new callback `applyCurrentSettings` that re-reads the current `mode` and resets `minutes / seconds / totalTime / remainingTime / inputValue` from the latest `minutesForMode(mode)`, and stops `isRunning`. Effectively the same body as the existing idle-sync effect, but callable on demand and unconditional.

Return it alongside the existing API.

### 2. `src/components/PomodoroTimer.tsx`
- Pull `applyCurrentSettings` from `usePomodoroTimer`.
- Pass it down to `<PomodoroSettingsSheet>` as a new prop `onApplyConfig`.

### 3. `src/components/pomodoro/PomodoroSettingsSheet.tsx`
- Add prop `onApplyConfig?: () => void`.
- Rewrite the Actions section so the two buttons become (in this order):
  1. Primary button: **"Set this configuration"** → calls `onApplyConfig?.()` then `onOpenChange?.(false)` so the sheet closes and the pill immediately shows the new duration (e.g. 40:00).
  2. Outline button: **"Reset pomodoro cycle"** → calls `onResetCycle?.()`.
- Remove the existing "Restore defaults" button entirely (per user request — that label/action goes away; the second slot is now the cycle reset).

No styling/theme changes, no behavior changes to sliders, sounds, vibration, or Liquid Glass positioning.

## Verification

- Open Pomodoro settings, slide Focus to 40, tap **Set this configuration** → sheet closes, pill shows `40:00`, "Session: 40 min".
- Tap **Reset pomodoro cycle** → tomato count resets to `0/4` and timer returns to focus mode at the current configured focus length.
- Works identically in Dark, Light, BlackPink, and Liquid Glass themes (no theme-specific branches touched).
