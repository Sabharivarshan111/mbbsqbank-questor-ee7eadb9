## Walkthrough fixes

Three targeted fixes to `src/components/walkthrough/Walkthrough.tsx`, `src/components/walkthrough/walkthroughSteps.ts`, and `src/components/theme/ThemeToggle.tsx`. No other features touched.

### 1. "Create Your Own Theme" step actually shows the dialog

Right now the step just highlights the theme icon — the user never sees the "Create Your Own…" option or the color pickers.

- Add an optional `action?: 'open-custom-theme'` field on `WalkthroughStep`.
- Set it on the `custom-theme` step.
- In `Walkthrough.tsx`, when the active step has `action: 'open-custom-theme'`, dispatch `window.dispatchEvent(new CustomEvent('orbit:open-custom-theme'))` once on entry, and dispatch `'orbit:close-custom-theme'` when the step is left (next/back/skip/finish).
- In `ThemeToggle.tsx`, add a `useEffect` listening for those two events and toggling `customOpen`. Re-target the step at `[data-tour="custom-theme-dialog"]` placed on the dialog content, so the spotlight lands on the actual color pickers.

### 2. User can actually drag the Pomodoro pill during the drag step

The spotlight cutout currently has `pointerEvents: 'auto'` with `onClick={next}`, which swallows the long-press and drag gestures on the pill.

- Add optional `interactive?: boolean` to `WalkthroughStep` and set it on the `pomodoro-drag` step.
- In the spotlight `<div>`, when `step.interactive` is true:
  - set `pointerEvents: 'none'` (so touches go through to the pill),
  - remove the `onClick={next}` handler,
  - keep the visual ring + dim mask via `box-shadow`.
- The tooltip card stays fully interactive — user advances with the Next button (or arrow key) after trying the drag. Update the step copy to say "Try it now, then tap Next."

### 3. Creator-name link is visible (tooltip stops covering it)

On mobile the target sits at the page bottom, so `recompute` scrolls it to center but the tooltip's fallback position (`bottom: 24`) then sits on top of the highlighted pill, hiding the name.

- In `recompute`, use `block: 'start'` (with a top offset) for steps flagged `placement: 'below'`, and add `placement` to the `report-issue` step so the target lands in the upper third of the viewport.
- In the card-positioning logic, after picking below/above/fallback, detect if the chosen card rectangle would overlap the spotlight rect (with a 12 px gap). If it would, fall back to the opposite side; if neither side fits, place the card at the top of the viewport instead of the bottom for bottom-anchored targets.
- This guarantees the tooltip never covers the spotlight target, so "Sabharivarshan S" + the pulse dot are both visible.

### Out of scope

- No changes to Pomodoro logic, themes, or any other features.
- No new dependencies. No backend.
- Walkthrough still appears only on first run via the existing `orbit-walkthrough-completed` localStorage key.
