## Why this only happens in Liquid Glass

Reproduced in the preview: in Dark theme the “Create Your Own Theme” dialog renders centered as expected. The moment Liquid Glass is active, the same dialog drops to the bottom of the page, with the page scrolling behind it, so the Reset / Apply Theme buttons fall below the fold.

Liquid Glass adds several theme‑wide rules in `src/index.css` that **only** target this theme — no other theme has them:

- `html.liquid-glass [role="dialog"]` (lines ~770–787) forces `background-color`, `border`, `box-shadow` (incl. `inset`) and `backdrop-filter` with `!important`.
- `html.liquid-glass *` (lines ~838–845) defines a global 400 ms transition list (`background-color, border-color, box-shadow, opacity, backdrop-filter, color`).
- `html.liquid-glass [data-state="open"], html.liquid-glass [data-state="closed"]` (lines ~847–851) overrides `animation-duration: 350ms !important`.

The Radix `DialogContent` relies on a static `translate(-50%, -50%)` plus a `tailwindcss-animate` enter animation that animates `transform`. Under these Liquid Glass overrides the dialog ends up keeping the animation’s end-state transform (identity) instead of the static centering transform, so it lands wherever the document flow leaves it — pinned to the bottom of the viewport. Other themes don’t touch dialog styling, so Radix’s default centering works untouched.

The user’s `CustomThemeDialog` already passes correct centering utilities (`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85dvh] overflow-y-auto`). The fix is to make sure those positioning rules win in Liquid Glass too.

## Fix (frontend / CSS only, scoped to Liquid Glass)

Add one targeted rule in `src/index.css`, right next to the existing `html.liquid-glass [role="dialog"]` block (so dialog visuals and dialog positioning live together):

```css
/* Lock Radix dialog content to viewport center in Liquid Glass —
   the theme's global transitions and animation overrides above strip
   the static centering transform otherwise. */
html.liquid-glass [role="dialog"] {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  max-height: 85dvh;
  overflow-y: auto;
  width: calc(100vw - 2rem);
  max-width: 28rem; /* matches max-w-md the dialog already requests */
}
```

Why this works:

- `position/top/left/transform !important` defeat any leftover animation end-state on `transform` and any future Liquid Glass override.
- `max-height: 85dvh` + `overflow-y: auto` guarantee the Apply Theme button is always reachable even on short viewports (Pixel-class phones with ~640 CSS px height).
- Scoped to `html.liquid-glass [role="dialog"]`, so Dark / Light / BlackPink / Custom themes keep their existing centered behavior untouched — no regression.
- No JS change needed in `CustomThemeDialog.tsx` — the existing Tailwind classes already match this intent, this rule just makes them stick.

## Out of scope

No changes to: timer engine, Pomodoro pill, AI chat, theme tokens, walkthrough, ThemeProvider, or backend. Only the one CSS rule above.
