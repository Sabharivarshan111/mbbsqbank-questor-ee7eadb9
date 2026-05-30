# Fix Liquid Glass Theme — AI Chat Fullscreen & Pomodoro Pill

Two visual/behavior bugs only in the Liquid Glass theme. Both stay UI-only and don't touch any logic. The Liquid Glass color palette itself is preserved exactly.

## 1. AI Chat — expand arrow doesn't go fullscreen

**Cause:** The fullscreen wrapper uses `bg-background/95` (white in Liquid Glass), and the inner `Card` keeps its hardcoded dark `bg-gray-950/70` styling. The container renders, but the card visually doesn't read as fullscreen — it looks like a floating panel on a near-white sheet (matches the second screenshot exactly).

**Fix in `src/components/AiChat.tsx`:**
- Detect `theme === "liquid-glass"` and add a third `cardClassName` / `headerClassName` / `titleClassName` / `clearButtonClassName` branch using glass tokens (`bg-card/70`, `border-border/50`, `backdrop-blur-xl`, `text-foreground`, etc.) so the card actually fills and blends inside the white fullscreen overlay.
- Switch the fullscreen wrapper background to a theme-aware gradient: in Liquid Glass use a soft `bg-gradient-to-br from-background via-background to-secondary/60 backdrop-blur-2xl`; in dark/blackpink keep current `bg-background/95`.
- Keep `h-full` / `flex flex-col` layout intact so the inner card stretches to fill.

No state machine, no event wiring changes — the click already toggles correctly; this is purely a visibility/contrast fix.

## 2. Pomodoro Pill — Liquid Glass styling + minimize parity

**Cause:** `PomodoroTimer.tsx` collapses Liquid Glass into the plain `dark` style (`bg-black border-white`), which looks like a black slab on a white page and the close/minimize button inherits Liquid Glass global button overrides that wash it out.

**Fix in `src/components/PomodoroTimer.tsx`:**
- Stop forcing Liquid Glass into `dark`. Add a real `liquid-glass` branch to `getThemeStyles()`:
  - `background`: `bg-gradient-to-br from-white/70 via-white/55 to-blue-100/50 border border-white/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,38,135,0.18)]` (the "guardian gradient" frosted look)
  - `text`: `text-slate-900`
  - `button`: `border-slate-900/30 text-slate-900 hover:bg-white/70`
  - `iconColor`: `text-slate-900`
  - `badge`: `bg-white/60 text-slate-800 border-white/70`
- Pass a new `theme` value through to child components. To keep `TimerDisplay` / `TimerControls` / `TimerProgress` type-safe without a big refactor, extend their `theme` union to include `"liquid-glass"` and add a matching style branch in each (mirrors the existing dark/light/blackpink switches). Same look as the pill: white frosted with soft blue accents.
- Minimized floating button: when `!isVisible`, currently renders `bg-black text-white`. Add the Liquid Glass branch so the small floating button uses the same frosted gradient + dark icon, matching the pill so it visually integrates and stays tappable.
- No logic changes to drag/long-press, visibility persistence, or timer state — only `getThemeStyles()` + per-child style maps.

## Out of scope

- No changes to Liquid Glass color tokens in `index.css`.
- No changes to question-bank, badges, or any other component.
- No changes to timer/audio/drag behavior.

## Technical notes

Files edited:
- `src/components/AiChat.tsx`
- `src/components/PomodoroTimer.tsx`
- `src/components/pomodoro/TimerDisplay.tsx`
- `src/components/pomodoro/TimerControls.tsx`
- `src/components/pomodoro/TimerProgress.tsx`

All styling done with existing Tailwind utilities + the project's semantic tokens. No new dependencies.
