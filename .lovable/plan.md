Plan: Fix Pomodoro settings opening in Liquid Glass

Root cause
- The Pomodoro pill is still being portaled directly into `document.documentElement` (`<html>`), which creates invalid DOM (`div` as a child of `html`) and can break stacking/event behavior in Liquid Glass on mobile WebView.
- The settings button also sits inside the draggable pill wrapper, so touch/drag handling can interfere with a normal tap in Liquid Glass.

Implementation
1. Update `src/components/PomodoroTimer.tsx`
   - Stop portaling Pomodoro UI into `document.documentElement`.
   - Portal the pill/mini-circle into `document.body` instead, matching normal app/modal behavior.
   - Keep the same fixed bottom-center positioning and existing high z-index for the pill.
   - Always render the controlled `<PomodoroSettingsSheet />` outside the pill portal so the sheet can stay mounted independently.
   - When settings opens, hide the pill/mini-circle across all themes until the sheet closes.
   - Add explicit tap handling on the gear button (`stopPropagation`) so the drag wrapper cannot swallow the settings tap.

2. Update only if needed: `src/components/pomodoro/PomodoroSettingsSheet.tsx`
   - Ensure the controlled `open` / `onOpenChange` path renders the sheet content without requiring `SheetTrigger`.
   - Keep the existing settings UI, labels, sliders, and behavior unchanged.

3. Validate
   - Liquid Glass: tapping the gear opens the bottom settings sheet visibly.
   - Pill disappears while settings are open and returns after closing.
   - Dark, light, and blackpink themes keep the same behavior.
   - Console no longer shows the invalid `div` inside `html` warning from Pomodoro.