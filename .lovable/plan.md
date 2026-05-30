# Plan: Always-visible Essay/Short-Notes tab pill + Search bar in all themes

Both issues share the same root cause: in Liquid Glass and Custom ("My Theme"), the active TabsTrigger uses `bg-background` and the search Input uses `bg-gray-100 dark:bg-gray-800/50`, which collapse into the page background. Fix is purely presentational — add a guaranteed surface color, border, radius, and shadow scoped to these two themes. No structure changes; Light/Dark/Black Pink stay exactly as they are.

## 1. Active tab pill — `src/index.css`
Add scoped rules so the active TabsTrigger always has a visible filled container.

- `html.liquid-glass [role="tablist"]` → frosted shell: `background: hsl(0 0% 100% / 0.55); backdrop-filter: blur(20px) saturate(160%); border: 1px solid hsl(220 13% 85% / 0.6); border-radius: 0.75rem; box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.7), 0 4px 14px hsl(220 30% 40% / 0.08);`
- `html.liquid-glass [role="tab"][data-state="active"]` → solid white pill: `background: hsl(0 0% 100%) !important; color: hsl(220 25% 15%) !important; border-radius: 0.5rem; box-shadow: 0 1px 2px hsl(220 30% 40% / 0.15), 0 4px 10px hsl(220 30% 40% / 0.1);`
- `html.custom [role="tablist"]` → `background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 0.75rem;`
- `html.custom [role="tab"][data-state="active"]` → `background: hsl(var(--card)) !important; color: hsl(var(--card-foreground)) !important; box-shadow: 0 1px 2px hsl(0 0% 0% / 0.25), 0 4px 10px hsl(0 0% 0% / 0.15); border-radius: 0.5rem;`

Fallback when `--card` is too close to `--background` is already enforced by the `MIN_DELTA = 6` step in `applyCustomTheme` (previous change), so the active pill will visibly separate from the page in every custom palette.

## 2. Search bar pill — `src/index.css`
Override the hard-coded `bg-gray-100 dark:bg-gray-800/50` in `SearchBar.tsx` only for these two themes, preserving the existing `h-14 rounded-full` shape.

- `html.liquid-glass .search-input` → `background: hsl(0 0% 100% / 0.7) !important; backdrop-filter: blur(20px) saturate(160%); border: 1px solid hsl(220 13% 85% / 0.7) !important; box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.8), 0 6px 18px hsl(220 30% 40% / 0.08); color: hsl(220 25% 15%);`
- `html.liquid-glass .search-icon` → `color: hsl(220 20% 40%);`
- `html.custom .search-input` → `background: hsl(var(--card)) !important; border: 1px solid hsl(var(--border)) !important; color: hsl(var(--card-foreground)); box-shadow: 0 2px 8px hsl(0 0% 0% / 0.15);`

Both keep `rounded-full` from the existing className, so the pill shape matches Light/Dark.

## Out of scope
- No JSX/component refactor — Tabs/SearchBar markup is unchanged so the Light Theme keeps its exact current look.
- No changes to Dark, Light, or Black Pink rules.
- No changes to year-badge, accordions, AI chat, Pomodoro, or data.
