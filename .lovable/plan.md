# Curved Labels Around Theme & Font Size Buttons

You want the two round buttons in the header (theme picker + font size) to have their names ("THEMES" and "FONT SIZE") curving along the top of the circle border, like in your sketch.

## What I'll build

A small reusable wrapper `CircleLabel` that renders an SVG `<text>` on a circular `<path>` (using `textPath`) wrapped around each button. The button itself stays exactly as it is — same icon, same dropdown, same click behavior. Only a thin label arcs along the outer edge.

- Font size button → label **"FONT SIZE"** curving along the top
- Theme button → label **"THEMES"** curving along the top
- Label uses `text-[8px]` (tiny, uppercase, tracked) in `text-muted-foreground` so it adapts to every theme (dark, light, blackpink, custom)
- Slight extra outer padding (~14–16px) on the wrapper so the curved text doesn't get clipped and doesn't collide with neighboring elements

## Files to edit

- `src/components/theme/CircleLabel.tsx` — new wrapper component (SVG ring + textPath, children = the actual button)
- `src/components/theme/FontSizeToggle.tsx` — wrap `<Button>` trigger with `<CircleLabel text="FONT SIZE">`
- `src/components/theme/ThemeToggle.tsx` — wrap the theme `<Button>` trigger with `<CircleLabel text="THEMES">`

## Technical detail

```tsx
// CircleLabel.tsx (sketch)
<div className="relative inline-flex items-center justify-center p-3">
  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 60 60">
    <defs>
      <path id={id} d="M 6,30 A 24,24 0 0 1 54,30" fill="none" />
    </defs>
    <text className="fill-muted-foreground" style={{ fontSize: 7, letterSpacing: 1.5 }}>
      <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
    </text>
  </svg>
  {children}
</div>
```

No logic changes, no new deps, no theme-token changes. Out of scope: animating the text, adding labels to other buttons.
