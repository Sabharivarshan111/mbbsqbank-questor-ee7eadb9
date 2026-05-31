## Issue found

Liquid Glass is the only theme using scroll-driven viewport tracking for the Pomodoro pill:

- `PomodoroTimer.tsx` recalculates `top/left` on every `scroll` / `visualViewport` event.
- The pill is positioned with `absolute` in Liquid Glass, while other themes use stable `fixed` positioning.
- Liquid Glass also has global transition rules and backdrop blur effects, so repeated scroll updates make the pill visually wobble/jitter.

I verified it in the mobile preview: after switching to Liquid Glass and scrolling, the Pomodoro pill remains visible but shows layout movement/jitter; the browser profile also reports the Pomodoro floating element as a layout-shift contributor.

## Plan

1. **Make Liquid Glass use the same stable anchoring as other themes**
   - Remove the Liquid Glass-only `visualViewport` / scroll tracking from `PomodoroTimer.tsx`.
   - Use one shared `position: fixed` bottom-center style for Dark, Light, BlackPink, and Liquid Glass.
   - Keep `document.body` as the portal root.

2. **Keep drag behavior intact**
   - Preserve `useLongPressDrag` behavior.
   - When dragged, keep the saved `fixed` pixel position exactly like other themes.
   - When not dragged, return to the bottom-center pill/mini-pill position.

3. **Stop Liquid Glass hover/transition rules from moving the pill**
   - Keep the Pomodoro-specific CSS transition override.
   - Strengthen the override so the floating pill, mini-pill, and their buttons do not receive Liquid Glass transform transitions or hover translate effects.

4. **Keep settings sheet working**
   - Do not remove the gear click behavior.
   - Keep the settings sheet opening from the Pomodoro gear.
   - Only simplify Liquid Glass sheet positioning if needed so it uses the normal Radix bottom sheet behavior without scroll wobble.

5. **Verify after implementation**
   - Mobile viewport: Liquid Glass expanded pill while scrolling.
   - Mobile viewport: Liquid Glass mini-circle after closing the pill while scrolling.
   - Gear opens Pomodoro settings in Liquid Glass.
   - Compare with Dark theme to confirm positioning behavior matches.