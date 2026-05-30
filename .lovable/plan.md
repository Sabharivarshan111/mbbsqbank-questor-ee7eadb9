# Liquid Glass — 3 fixes

## 1. Black bar at the bottom of the page
The strip you circled is the `html` element showing through because only `body` gets `bg-background` and on the liquid-glass page the body sometimes doesn't paint all the way to the bottom (safe-area / overscroll region).

Fix: in `src/index.css`, paint the html root in liquid-glass so nothing dark leaks through.

```css
html.liquid-glass {
  background-color: hsl(var(--background));
}
```

If the bar persists I'll also add `min-height: 100dvh` to `body` under liquid-glass to cover the mobile address-bar gap.

## 2. AI chat "Expand" button looks stuck (image 2)
The fullscreen wrapper currently uses dark hard-coded classes (`bg-gray-950/70`, `border-gray-800`). In liquid-glass the dark card sits on the white frosted page and the surrounding fullscreen overlay (`bg-background/95`) is almost white — so the chat looks "trapped" in the top half with white below, even though it IS expanded.

Fix in `src/components/AiChat.tsx`:
- Add a third branch in `cardClassName` / `headerClassName` / `clearButtonClassName` for `theme === "liquid-glass"` using frosted tokens:
  - `bg-white/55 backdrop-blur-xl border-white/40 text-foreground shadow-[0_8px_32px_hsl(220_20%_40%/0.15)]`
  - Header & footer borders → `border-white/40`
  - Clear / Maximize buttons → `text-foreground/70 hover:text-foreground`
- Keep current dark/blackpink branches untouched.

Also ensure the fullscreen container fills properly:
- Change wrapper to `fixed inset-0 z-[60] flex flex-col bg-background/80 backdrop-blur-xl p-2 pb-[env(safe-area-inset-bottom)]` (adds `flex flex-col` so the inner `h-full` chain works reliably).

## 3. Pomodoro pill in liquid glass
Right now `PomodoroTimer.tsx` maps `liquid-glass` → `dark`, so the pill renders solid black on the white liquid-glass page (or only the collapsed dot is visible as in image 1).

Fix:
- Stop forcing the fallback: keep a typed local `pillTheme` that's `'dark' | 'light' | 'blackpink' | 'liquid-glass'`.
- Pass `'dark'` only into the child components (`TimerControls`, `TimerDisplay`, `TimerProgress`) since they're typed for the original three — no behavior change there.
- Add a 4th branch in `getThemeStyles()` for liquid-glass:
  ```ts
  liquid-glass: {
    background:
      'bg-white/55 backdrop-blur-2xl saturate-150 border border-white/40 ' +
      'shadow-[0_8px_32px_hsl(220_20%_40%/0.18),inset_0_1px_0_hsl(0_0%_100%/0.7)]',
    text: 'text-foreground',
    button: 'border-white/50 text-foreground hover:bg-white/60',
    iconColor: 'text-foreground',
    badge: 'bg-white/60 text-foreground border-white/50',
  }
  ```
- Use the same frosted background for the collapsed "Show timer" button so it doesn't look like a hard black dot on a glass page.

All existing features (drag, settings sheet, water counter, sounds, vibration, stats, online presence, mode switching, persistence) stay exactly as they are — only the visual skin for the liquid-glass theme is added.

## Files touched
- `src/index.css` — html background rule for liquid-glass
- `src/components/AiChat.tsx` — liquid-glass card/header/footer skin + fullscreen wrapper layout
- `src/components/PomodoroTimer.tsx` — 4th theme branch with frosted glass styles
