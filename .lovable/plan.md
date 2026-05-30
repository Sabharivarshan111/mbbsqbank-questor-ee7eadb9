# Liquid Glass — Fullscreen overlay + Pomodoro position

Two related symptoms in Liquid Glass (image 2):
- Tapping the AI chat expand arrow still shows the chat embedded in the page (footer + page content visible below), not fullscreen.
- The Pomodoro mini-circle ends up inside the page footer area instead of pinned to the viewport bottom-center like every other theme.

Both point to the same root cause: in Liquid Glass an ancestor of these `position: fixed` elements is creating a new containing block, so `inset-0` / `bottom-10 left-1/2` resolve against that ancestor instead of the viewport. The Index page tree is `<div className="min-h-screen ... overflow-x-hidden relative">` and the liquid-glass theme adds `html.liquid-glass body { position: relative; overflow-x: hidden }` plus animation `filter: blur(8px)→blur(0)` on body, which on mobile Chrome turns body into a containing block for fixed children. So the AI fullscreen overlay falls back into normal flow and the Pomodoro pill scrolls with the page.

The fix is to bypass that ancestor entirely for both floating UIs and harden their positioning.

## 1. AI Chat — render fullscreen overlay through a portal mounted on `documentElement`

In `src/components/AiChat.tsx`:
- Replace the current `createPortal(..., document.body)` with `createPortal(..., document.documentElement)` so even body-level filter/transform/overflow rules cannot scope it.
- Wrapper styling: `position: fixed; inset: 0; width: 100vw; height: 100dvh; z-index: 2147483000; isolation: isolate;` plus a solid Liquid Glass background (`bg-[hsl(var(--background))]` not transparent gradient, and a separate inner blurred layer for the frosted look) — guarantees the page content is visually covered even if fixed semantics drift.
- Keep `document.body.style.overflow = 'hidden'` while open (already in place).
- Inner card: `flex-1 min-h-0` instead of `h-full` so it stretches to the wrapper regardless of flex/percentage quirks.

## 2. Pomodoro pill — portal it too, and lock its position

In `src/components/PomodoroTimer.tsx`:
- Wrap both the expanded pill and the minimized circle in `createPortal(..., document.documentElement)` so they always sit at the top of the layer tree.
- Force positioning with inline style instead of Tailwind classes: `position: fixed; left: 50%; bottom: max(2.5rem, env(safe-area-inset-bottom) + 1rem); transform: translateX(-50%); z-index: 2147483000;` (drop the `transform -translate-x-1/2` Tailwind classes that combine with the drag offset logic).
- The drag-position branch keeps its existing inline `left/top` override; only the default branch changes.
- The minimized state's small circle uses the exact same positioning logic, so the closed mini button always lands in the same spot as in Dark/Blackpink/Custom themes.

## 3. Defensive: stop Liquid Glass body fade-in from creating a containing block

In `src/index.css`, the `liquid-fade-in` keyframes use `filter: blur(8px) → blur(0)` on `body`. Even if it's only 600ms, on slow mobile devices this can still be active during the first paint of the Pomodoro pill and bake in a wrong containing block. Change the animation to apply to `html.liquid-glass body::after` (a transparent overlay pseudo-element) instead of `body` itself, keeping the same visual fade without ever touching body's filter property. No color or look change — the fade-in feels identical.

## Out of scope

- No changes to Liquid Glass colors, tokens, gradients, palettes, fonts, or spacing.
- No changes to AI logic, timer logic, drag/long-press behavior, or visibility persistence.
- No changes to other themes — they keep their exact current positioning and visuals.

## Files edited

- `src/components/AiChat.tsx` — portal target + solid overlay + inner sizing
- `src/components/PomodoroTimer.tsx` — portal wrap + inline fixed positioning for pill and mini circle
- `src/index.css` — move `liquid-fade-in` from `body` to `body::after`
