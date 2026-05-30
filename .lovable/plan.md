## Goal
Make the Pomodoro pill draggable via long-press, with an Apple "liquid glass" blur effect and a hint label ("Drag anywhere ✦") shown while repositioning. Persist the chosen position.

## Behavior
- **Trigger:** Long-press (~450ms) anywhere on the pill background (not on buttons/inputs) — works for both touch and mouse. A short tap still operates normal controls.
- **Drag mode active:**
  - Pill content becomes blurred (`backdrop-blur-2xl`, reduced opacity, subtle white/refractive border, soft inner highlight — liquid-glass look).
  - A centered overlay label appears on the pill: "✦ Drag anywhere ✦" (or "Move me anywhere").
  - Subtle scale-up (1.05) + shadow lift, light haptic vibration on entering drag.
  - Cursor becomes `grabbing`.
- **Drag movement:** Follows pointer; clamped within viewport with 8px margin so it never goes off-screen.
- **Exit drag mode:** On pointer release. Position is saved to `localStorage` (`pomodoroPosition` = `{x, y}`). Next session restores it.
- **Reset:** Double-tap the mode badge already exists for mode switching — no conflict. If position ever goes out of bounds (window resize), it's re-clamped on mount.

## Implementation
- Edit `src/components/PomodoroTimer.tsx`:
  - Replace `fixed bottom-10 left-1/2 -translate-x-1/2` positioning with controlled `left/top` style driven by state, defaulting to bottom-center when no saved position.
  - Add `usePomodoroDrag` logic inline (or new hook `src/hooks/use-long-press-drag.ts`) handling `pointerdown` → timer → `isDragging` → `pointermove` (with clamping) → `pointerup`.
  - Add drag-mode className conditional: `backdrop-blur-2xl bg-white/10 dark:bg-white/5 border-white/30 shadow-2xl scale-105` plus a `before:` overlay element with the hint text centered.
  - Cancel long-press if pointer moves >8px before timer fires (so scrolling/tap works normally).
  - Prevent long-press from starting when target is `button`, `input`, or inside controls (use `closest()` check).
- No changes to timer logic, sounds, presence, settings, or other files.

## Out of scope
- No new dependencies (pure pointer events, no framer-motion needed for this).
- No changes to theme tokens, other components, or backend.
