## Goal

Fix walkthrough overlap issues and add two missing focused steps so each spotlight clearly points at the right element.

## Problems observed

1. **Pomodoro pill is always shown during the whole walkthrough.** It floats at the bottom and physically covers the AI-chat expand button, the creator-name pill, and other targets, so several steps look broken.
2. **"Create Your Own" entry isn't explained.** The walkthrough jumps straight from the theme button to the Custom Theme dialog, skipping the dropdown item users actually have to click.
3. **Pomodoro settings step only spotlights the gear icon**, never opens the sheet, so users don't see the duration sliders or the "Set this configuration" button.
4. **AI chat expand step targets the whole chat card**, so the tooltip card sits over the expand (Maximize) button in the top-right corner instead of pointing at it.

## Changes

### 1. `src/components/PomodoroTimer.tsx`
- Add a window-event API so the walkthrough can force the pill into one of three states without losing the user's saved preference:
  - `orbit:pomodoro-walkthrough-show` → temporarily render the full pill, ignore stored `pomodoroVisible`.
  - `orbit:pomodoro-walkthrough-minimize` → temporarily render only the small mini-circle.
  - `orbit:pomodoro-walkthrough-hide` → temporarily unmount the pill **and** the mini-circle entirely (returns nothing).
  - `orbit:pomodoro-walkthrough-clear` → drop the override and restore the user's stored visibility.
- Implement with a `walkthroughOverride: 'show' | 'minimize' | 'hide' | null` state. Render logic:
  - `hide` → `return null`
  - `minimize` → render only the mini-circle branch (forces `isVisible=false` behavior without writing localStorage)
  - `show` → render full pill (forces `isVisible=true` behavior without writing localStorage)
  - `null` → existing behavior
- Add a new `orbit:open-pomodoro-settings` / `orbit:close-pomodoro-settings` listener that calls `setSettingsOpen(true/false)` so the walkthrough can open the settings sheet.
- Add `data-tour="pomodoro-apply-config"` to the **Set this configuration** button (in `PomodoroSettingsSheet.tsx`).

### 2. `src/components/pomodoro/PomodoroSettingsSheet.tsx`
- Add `data-tour="pomodoro-apply-config"` to the `<Button>` rendered for `onApplyConfig` ("Set this configuration").
- Add `data-tour="pomodoro-settings-sheet"` to the `<SheetContent>` so a step can spotlight the whole expanded panel.

### 3. `src/components/theme/ThemeToggle.tsx`
- Listen for `orbit:open-theme-menu` and `orbit:close-theme-menu`; convert the `DropdownMenu` to controlled `open` state and toggle it on those events.
- Add `data-tour="theme-create-own"` to the **Create Your Own…** `DropdownMenuItem`.

### 4. `src/components/walkthrough/walkthroughSteps.ts`
- Extend `WalkthroughStep` with `pomodoro?: 'show' | 'minimize' | 'hide'` and `action?: 'open-custom-theme' | 'open-theme-menu' | 'open-pomodoro-settings'`.
- Update the steps array (in order):

```text
welcome                 pomodoro: hide
qbank                   pomodoro: hide
ai-chat                 pomodoro: hide  (target the card; tooltip stays out of corner)
ai-chat-expand   NEW    pomodoro: hide  (targets the maximize/minimize button, data-tour="ai-chat-expand")
theme-toggle            pomodoro: hide
theme-create-own NEW    pomodoro: hide, action: 'open-theme-menu'
                         (targets [data-tour="theme-create-own"]; explains "Tap this to design your own theme")
custom-theme            pomodoro: hide, action: 'open-custom-theme'
font-size               pomodoro: hide
pomodoro-pill           pomodoro: show
pomodoro-start          pomodoro: show
pomodoro-drag           pomodoro: show, interactive
pomodoro-settings       pomodoro: show, action: 'open-pomodoro-settings'
                         (targets [data-tour="pomodoro-settings-sheet"])
pomodoro-apply  NEW     pomodoro: show, action: 'open-pomodoro-settings'
                         (targets [data-tour="pomodoro-apply-config"]; circles "Set this configuration")
pomodoro-close          pomodoro: show
report-issue            pomodoro: hide  (so the creator pill is unobstructed)
```

### 5. `src/components/AiChat.tsx`
- Add `data-tour="ai-chat-expand"` to the Maximize/Minimize `<Button>` in the header.

### 6. `src/components/walkthrough/Walkthrough.tsx`
- On every step change, dispatch:
  - `orbit:pomodoro-walkthrough-${step.pomodoro ?? 'hide'}` (default `hide` if not specified — strict policy: pomodoro is only visible when explicitly asked).
  - `orbit:open-theme-menu` when `action === 'open-theme-menu'`; `orbit:close-theme-menu` on exit.
  - `orbit:open-pomodoro-settings` when `action === 'open-pomodoro-settings'`; on exit, `orbit:close-pomodoro-settings` **only if** the next step's action isn't also `open-pomodoro-settings` (so settings stays open across `pomodoro-settings` → `pomodoro-apply`).
- On finish/unmount, dispatch `orbit:pomodoro-walkthrough-clear`, `orbit:close-theme-menu`, `orbit:close-custom-theme`, `orbit:close-pomodoro-settings` so the app returns to the user's saved state.
- Tooltip card positioning: when placing the card, also avoid covering small targets in viewport corners. If the target is in the top-right or top-left 25% of the viewport and narrower than 80px (e.g. the expand button), force `placement: 'below'` and clamp the card horizontally so it doesn't overlap the spotlight ring.

## Out of scope
- No timer engine, theme, AI chat content, or backend changes.
- No new dependencies.
- Walkthrough still runs once on first load (`orbit-walkthrough-completed`).