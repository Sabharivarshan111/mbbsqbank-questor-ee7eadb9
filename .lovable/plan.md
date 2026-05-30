## Plan

**1. Style "MEDICOS ZONE study material" button in Custom themes & Liquid Glass**

Currently `getExtraButtonClass()` in `src/components/QuestionBank.tsx` only handles `blackpink` and default (light/dark) — in Custom and Liquid Glass themes the button uses hardcoded `bg-blue-600`/`bg-gray-100` which clashes with user-picked colors.

Add scoped CSS in `src/index.css` (alongside existing `html.custom [role="tablist"]` rules) targeting the Extras button via a new class `extras-tab-button` added to the button in `QuestionBank.tsx`:

- `html.custom .extras-tab-button` → inactive: `background: hsl(var(--card))`, `color: hsl(var(--card-foreground))`, `border: 1px solid hsl(var(--border))`
- `html.custom .extras-tab-button[data-active="true"]` → active: `background: hsl(var(--background))`, `color: hsl(var(--foreground))`, `border: 1px solid hsl(var(--border))`, shadow matching active tab
- `html.liquid-glass .extras-tab-button` → frosted inactive (translucent white + blur + border)
- `html.liquid-glass .extras-tab-button[data-active="true"]` → solid white pill with shadow (matches active tab style)

In `QuestionBank.tsx`:
- Add `extras-tab-button` className and `data-active={activeTab === "extras"}` attribute to the button
- Keep existing `getExtraButtonClass()` logic for blackpink/default themes (CSS overrides via `!important` for custom/liquid-glass)

Also apply matching surface to `ExtrasContent.tsx` panel in custom/liquid-glass via existing token-based classes — replace hardcoded `bg-gray-50 dark:bg-gray-900` fallback with `bg-card` when theme is custom/liquid-glass (or add CSS rule `html.custom .extras-panel { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }`).

**2. Replace surprise text in footer**

In `src/pages/Index.tsx`, change:
```
👆 tap my name for a surprise!
```
to:
```
👆 tap my name to report any issues!
```

No other changes. No data, accordions, AI chat, Pomodoro changes.
