# Plan: Theme polish + Pomodoro pill reset

## 1. Liquid Glass theme dot in the Themes menu
**File:** `src/components/theme/ThemeToggle.tsx`
- Currently the Liquid Glass option shows a plain white circle.
- Replace its swatch with a frosted-glass preview: a small circle using `backdrop-blur`, soft white→blue radial gradient, subtle inner highlight + ring (matches the Apple liquid-glass aesthetic).
- Add the same gradient "halo pill" treatment around the main Themes toggle button when liquid-glass is active (similar to how Light theme already shows a soft ring), so the trigger circle looks consistent with the rest of the theme.

## 2. Custom ("My Theme") — missing card/search box
**File:** `src/components/theme/ThemeProvider.tsx` (`applyCustomTheme`)
- Right now when card color is very close to background, the "MEDICOS ZONE study material" panel and search input visually disappear (images 2 and 3 show this).
- Adjust the derivation so `--card`, `--secondary`, `--muted`, `--input`, `--border` always step a minimum delta (~6–10% lightness) away from `--background`, regardless of how close the user's chosen card hex is to the background. This guarantees the tab pill, search field, and study-material card stay visible in any custom palette.
- No change to user-chosen primary/foreground/background hexes themselves.

## 3. Liquid Glass — search box + tab pill visibility
**File:** `src/index.css` (inside `html.liquid-glass` block)
- Add explicit glass styling for `input`, `[role="tablist"]`, and the study-material header card so they show a frosted white surface with a soft border (matches the light-theme pill look the user references).
- Specifically: translucent white background (`hsl(0 0% 100% / 0.7)`), `backdrop-filter: blur(20px) saturate(160%)`, 1px border `hsl(220 13% 85% / 0.6)`, subtle inset highlight on top edge.

## 4. Pomodoro pill — reset position on reload
**File:** `src/components/PomodoroTimer.tsx` + `src/hooks/use-long-press-drag.ts`
- Today the dragged position persists across reloads (stored in localStorage by the drag hook).
- On mount, clear the stored position key so the pill always renders at its default `bottom-10 left-1/2` spot.
- Drag-to-move still works during the session; only the *persisted* position is cleared on every fresh load/open.
- If the hook doesn't currently persist (need to confirm by reading `use-long-press-drag.ts`), this step becomes a no-op and the pill already resets — will verify during implementation.

## Out of scope
- No changes to year-badge logic, accordion behavior, AI chat, data, or routing.
- No changes to Dark / Light / Black Pink themes.
