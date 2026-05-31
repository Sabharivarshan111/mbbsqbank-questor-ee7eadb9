## Root cause

In `src/components/PomodoroTimer.tsx` the pill/mini-circle is currently portaled into `document.documentElement` (the `<html>` element) for the Liquid Glass theme only:

```ts
const floatingPortalRoot = theme === 'liquid-glass' ? document.documentElement : document.body;
```

Mounting interactive UI as a direct child of `<html>` (instead of `<body>`) causes two problems on Android WebView in Liquid Glass:

1. Pointer/click events on the gear button do not reliably trigger React handlers → `setSettingsOpen(true)` never runs → the settings sheet never opens.
2. The Radix `Sheet` is portaled to `<body>`, so even when it does open it can fall under Liquid Glass's body-level stacking context.

Other themes use `document.body` and work correctly — including the bottom-center sheet shown in screenshot 1.

## Fix

Edit only `src/components/PomodoroTimer.tsx`:

1. Always portal the pill and mini-circle into `document.body` (drop the `theme === 'liquid-glass' ? document.documentElement : document.body` branch). This matches every other theme and matches normal Radix/modal behavior.
2. Keep the existing `fixedDefaultStyle` exactly as-is — `position: fixed; left: 0; right: 0; margin: auto; width: max-content; bottom: max(2.5rem, …)` — so the mini-circle and expanded pill stay pinned bottom-center in every theme, including Liquid Glass.
3. Keep `portalStyleReset` (`transition: 'none'`, `animation: 'none'` for liquid-glass) so the global `html.liquid-glass *` transition on `transform` does not drift the pill on first paint.
4. Keep the gear button as today: `onPointerDown stopPropagation` + `onClick stopPropagation` → `setSettingsOpen(true)`, with the early-return `if (settingsOpen) return settingsSheet;` so the pill hides while the sheet is open.
5. Leave `PomodoroSettingsSheet`, drag logic, visibility persistence, sounds, vibration, theme styles, and `index.css` untouched.

## Verification

- Liquid Glass: tap the gear in the Pomodoro pill → bottom settings sheet opens exactly like screenshot 1 (durations, alert sound, volume, vibration, reset).
- Liquid Glass: mini-circle and expanded pill stay anchored bottom-center on first paint, after toggling visibility, and on resize — same as Dark / Light / BlackPink.
- Long-press drag still moves the pill; tap on gear / close / play / reset still works.
- Dark, light, blackpink themes unchanged.
