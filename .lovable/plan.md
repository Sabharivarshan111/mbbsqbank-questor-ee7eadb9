## Three fixes (frontend only, no logic changes)

### 1. Liquid Glass — empty space below the footer (screenshot 1)

Cause: `html.liquid-glass body { min-height: 100dvh }` forces the page to fill the viewport even when content is shorter, so the gradient background shows below the footer. Other themes don't have this rule, which is why they don't show that gap.

Fix in `src/index.css` (line ~733): remove `min-height: 100dvh` from `html.liquid-glass body`. The body will now hug its content like every other theme. The `pb-24` we added previously already covers the Pomodoro pill clearance.

### 2. Liquid Glass — "Create Your Own Theme" dialog cut off (screenshot 2)

Cause: in Liquid Glass the Radix `DialogContent` ends up anchored toward the bottom of the viewport (the global `html.liquid-glass *` transition rule plus the dialog's slide animation lands the panel off-center on mobile), so the Apply button is below the fold.

Fix in `src/components/theme/CustomThemeDialog.tsx`: tighten the dialog so it always fits in the viewport and stays centered.

- Change `DialogContent` className to: `w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[85dvh] overflow-y-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fixed`
- Keep `data-tour="custom-theme-dialog"` and the existing children untouched.

This forces the dialog to sit centered on every theme and never exceed 85% of the dynamic viewport, so the Apply Theme button is always reachable.

### 3. Pomodoro pill covers the dialog while it's open (screenshot 3)

Cause: the fully-expanded Pomodoro pill stays pinned to the bottom of the screen on top of the dialog, covering Apply / preset rows.

Fix:

- `src/components/theme/CustomThemeDialog.tsx`: in a `useEffect` keyed on `open`, dispatch `window.dispatchEvent(new CustomEvent('orbit:custom-theme-opened'))` when `open` becomes true and `orbit:custom-theme-closed` when it becomes false. (Plain frontend wiring, no other behaviour change.)
- `src/components/PomodoroTimer.tsx`: add a new piece of state `dialogMinimized: boolean`. Listen for `orbit:custom-theme-opened` → `setDialogMinimized(true)`, and `orbit:custom-theme-closed` → `setDialogMinimized(false)`. Treat `dialogMinimized` like the existing walkthrough `minimize` override: when true, render only the small floating-circle pill (the `!effectiveVisible` branch) regardless of `isVisible` — without persisting any change to `localStorage`.

  Concretely: derive `const showAsMini = dialogMinimized || walkthroughOverride === 'minimize' || !effectiveVisible;` and use `showAsMini` instead of `!effectiveVisible` for the mini-circle branch. The user's "open/closed" preference for the pill is untouched — when the dialog closes, the pill restores to whatever it was before.

This applies to **all themes**, not just Liquid Glass.

### Out of scope

No timer engine, AI chat, theme tokens, walkthrough copy, or backend changes.
