## Goal

Make the `liquid-glass` theme apply a consistent frosted-glass look across every key shadcn primitive — Cards, Buttons (all variants), Accordions, Badges, Dialogs/Sheets/Drawers, Dropdowns, Popovers, Selects, Tooltips, Tabs, Inputs — without leaking into any other theme.

All changes are scoped under `html.liquid-glass` in `src/index.css`. Other themes are untouched.

## Surface treatment (one shared recipe)

Frosted panel:
```
backdrop-filter: blur(24px) saturate(180%);
background-color: hsl(var(--card) / 0.55);
border: 1px solid hsl(0 0% 100% / 0.14);
box-shadow: 0 8px 32px hsl(0 0% 0% / 0.4),
            inset 0 1px 0 hsl(0 0% 100% / 0.10);
border-radius: var(--radius);
```

Lighter variant (badges, chips, inline pills): `blur(12px)`, `bg-white/8`, `border-white/15`, no large shadow.

Primary/destructive buttons keep their solid tint but gain inset highlight + soft outer glow so they read as glass-on-glass.

## Per-component overrides

### Cards (`.bg-card`, `[data-slot="card"]`, common `rounded-lg border bg-card` combos)
- Apply full frosted panel recipe.
- `hover` lifts 1px and brightens border to `white/22`.

### Buttons (`button`, `[role="button"]`)
- **Default / secondary / outline / ghost**: glass panel + slight inner highlight; on hover background brightens to `white/12`.
- **Primary** (`.bg-primary`): keep `hsl(var(--primary) / 0.9)`, add `backdrop-filter: blur(12px)`, glossy inset highlight, soft `0 0 24px hsl(var(--primary)/0.45)` glow on hover.
- **Destructive** (`.bg-destructive`): same treatment with destructive color glow.
- **Icon buttons** (`size-icon`): preserve circular shape, glass background.
- Active/pressed: subtle `scale(0.97)` via existing transition.

### Accordions (`[data-orientation="vertical"]`, `[data-radix-accordion-item]`, AccordionTrigger/Content)
- Each `AccordionItem` becomes its own glass card: padded panel, `border` replaced by full frosted border, vertical gap between items.
- AccordionTrigger: transparent background, hover brightens via `bg-white/8`, chevron rotates smoothly with the Apple cubic-bezier.
- AccordionContent: subtle inner darker frost so nested content separates from the trigger.

### Badges (`[data-slot="badge"]`, `.inline-flex` pill patterns used by `CountBadge` + `Badge` component)
- All variants get the lighter glass variant: `blur(12px) saturate(160%)`, `bg-white/10`, `border-white/18`, soft inset highlight.
- Color-tinted badges (essay amber, short-notes indigo, destructive, HY red) keep their tint but the background mixes with white/8 overlay for the frosted feel via a `box-shadow inset` of `hsl(0 0% 100% / 0.1)`.

### Dialogs (`[role="dialog"]`, `[data-radix-dialog-content]`)
- DialogContent: full glass panel with stronger blur (`blur(32px) saturate(200%)`), thicker border `white/18`, deeper shadow.
- DialogOverlay: switch from solid black to `bg-black/40 backdrop-blur-md` so the underlying app is visibly blurred behind the modal.
- DialogHeader title uses SF Pro Display bold (already from base liquid-glass rule).

### Sheets / Drawers (`[data-radix-sheet-content]`, `[role="dialog"][data-state]`)
- Same as Dialog but with side-aware border (only inner edge gets the highlight). Slide-in motion eased with Apple cubic-bezier 400ms.

### Dropdowns / Popovers / Selects / Context menus / Menubars / Hover cards
- All matching `[data-radix-popper-content-wrapper] > *` already covered, but explicitly target each so colours don't fall back: `[data-radix-dropdown-menu-content]`, `[data-radix-popover-content]`, `[data-radix-select-content]`, `[data-radix-context-menu-content]`, `[data-radix-menubar-content]`, `[data-radix-hover-card-content]`, `[data-radix-tooltip-content]`.
- Menu items: hover `bg-white/12`, focused `bg-white/16`.

### Tabs (`[role="tablist"]`, `[role="tab"]`)
- Tablist becomes a glass pill container.
- Active tab: solid `hsl(var(--primary) / 0.25)` with inset glow.
- Inactive tabs: transparent, hover `white/8`.

### Inputs / Textareas / Select triggers (already partly handled)
- Increase border-radius to `var(--radius)`, add focus ring `0 0 0 3px hsl(var(--primary)/0.35)`.

### Toasts / Sonner (`[data-sonner-toast]`, `.toast`)
- Glass panel treatment so notifications match.

### Scroll areas / Separators
- Separator becomes `hsl(0 0% 100% / 0.1)`.

## Motion polish

- Keep the existing global 400ms cubic-bezier(0.32, 0.72, 0, 1) transition.
- Add `@keyframes liquid-pop` (scale 0.96 → 1, opacity 0 → 1, 280ms) and apply to dialog/popover/dropdown `[data-state=open]` entrances inside `html.liquid-glass` only.

## File touched

- `src/index.css` — extend the existing `html.liquid-glass` block. No other files change. Theme remains togglable.

## Out of scope

- No new dependencies, no font files, no JS changes.
- No edits to component source — all overrides are CSS-only via attribute/class selectors so they stay scoped to `html.liquid-glass`.
- No changes to data, logic, routes, or other themes.
