## Goal

Add a new selectable theme called **"Liquid Glass"** to the existing theme dropdown. When picked, the whole app shifts to an Apple-inspired glassmorphism look — frosted/blurred surfaces, SF Pro typography, bolder weights, and softer fluid motion. Switching back to any other theme (Dark / Light / Black Pink / My Theme) reverts everything to current default.

## Theme dropdown entry

In `src/components/theme/ThemeToggle.tsx`:
- Add a new `DropdownMenuItem` labeled **"Liquid Glass"** with a small frosted-glass icon (rounded white/blur square — pure CSS, no asset needed) and a subtle "NEW" badge.
- The label itself uses SF Pro Display (`font-family: -apple-system, "SF Pro Display", "SF Pro", BlinkMacSystemFont, ...`) and `font-bold` so it visually advertises the theme.
- Add `case "liquid-glass"` to `getButtonClass()` returning a translucent white pill with backdrop blur for the trigger icon.

## ThemeProvider changes

In `src/components/theme/ThemeProvider.tsx`:
- Extend `Theme` union with `"liquid-glass"`.
- Update the localStorage validation list, the `classList.remove(...)` call, and the saved-theme guard.
- Keep `applyCustomTheme` / `clearCustomTheme` flow intact — Liquid Glass relies purely on `.liquid-glass` class on `<html>`, no inline CSS-var overrides.

## Liquid Glass styling

All scoped under `html.liquid-glass` in `src/index.css` so it cannot leak into other themes.

### Color tokens (dark glass base)
- `--background`: deep cool charcoal (e.g. `220 30% 6%`)
- `--foreground`: near-white (`0 0% 98%`)
- `--card`, `--popover`: translucent — handled by overrides on actual components since CSS vars are HSL only. Tokens still set a fallback dark surface.
- `--primary`: Apple-style soft blue (`211 100% 60%`)
- `--border`: very low-opacity white (`0 0% 100%` used with `/10` in components)
- `--radius`: bump to `1rem` (more pill-like)

### Global rules under `html.liquid-glass`
- `body`: SF Pro Display/Text font stack, anti-aliased, `font-weight: 500` baseline, animated background gradient (radial blobs of `primary`, `accent`, soft pink) drifting via CSS keyframes for a "fluid" feel.
- `h1, h2, h3, h4, h5, h6`: `font-weight: 700`, tighter tracking, SF Pro Display.
- `button, [role="button"], .card, [data-radix-popper-content-wrapper] > *, [data-state]` containers commonly used by shadcn: apply
  ```
  backdrop-filter: blur(24px) saturate(180%);
  background: hsl(var(--card) / 0.45);
  border: 1px solid hsl(0 0% 100% / 0.12);
  box-shadow: 0 8px 32px hsl(0 0% 0% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.08);
  ```
- Selectors target the shadcn primitives already used in this app: `.bg-card`, `.bg-popover`, `.bg-background` (overridden), `[data-radix-dialog-content]`, `[data-radix-dropdown-menu-content]`, `[data-radix-popover-content]`, `[data-radix-select-content]`, `[data-radix-tooltip-content]`, `.accordion-item`, and the Pomodoro pill.
- Inputs / textareas: same glass treatment with lighter blur.
- Smooth global transitions: `* { transition: background-color 400ms cubic-bezier(.4,0,.2,1), border-color 400ms, box-shadow 400ms, transform 400ms; }` plus a body-level `transition: filter 500ms`.
- Accordion / dropdown / dialog enter/exit timings softened (use existing `accordion-down` keyframes but slower, 350ms with Apple cubic-bezier) by overriding `animation-duration` and `animation-timing-function` on `[data-state=open]`/`[data-state=closed]` only inside `html.liquid-glass`.
- Hover lift: `button:hover, .card:hover { transform: translateY(-1px); }` under the theme only.

### Animated background
- `html.liquid-glass body::before`: fixed full-viewport pseudo-element with three large radial gradients (blue / violet / pink at low opacity) and a slow `liquid-drift` keyframe (40s ease-in-out infinite) translating + rotating slightly. `pointer-events: none; z-index: -1;`
- Keyframes added inside the same `html.liquid-glass` scope so they don't pollute other themes.

### Pomodoro pill
- Already uses translucent classes; under `html.liquid-glass` increase blur to `backdrop-blur-2xl` equivalent via a CSS override so it matches the rest.

## Reversibility

Because every rule is namespaced under `html.liquid-glass`, removing the class (i.e. selecting any other theme) instantly reverts the UI. ThemeProvider already calls `classList.remove("light","dark","blackpink","custom")` — extend that list with `"liquid-glass"` so switching is clean.

## Out of scope

- No new dependencies, no font files added (rely on system SF fonts; users on non-Apple devices fall back to system-ui which still looks clean).
- No changes to data, routes, or business logic.
- No edits to other themes' appearance.
- No persistence/data changes beyond the existing `theme` localStorage key already in use.

## Files touched

1. `src/components/theme/ThemeProvider.tsx` — extend Theme type, classList handling, validation list.
2. `src/components/theme/ThemeToggle.tsx` — new dropdown item + trigger icon case + label styling.
3. `src/index.css` — full `html.liquid-glass { ... }` block with tokens, glass surface rules, animated background, motion timing.
