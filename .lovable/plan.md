I’ll fix the Pomodoro settings so the pill updates immediately to the selected custom time and the reset action restores factory defaults.

Plan:
1. Make `PomodoroTimer` the single source of truth for Pomodoro settings.
   - Pass the parent `settings` and `update` function into `PomodoroSettingsSheet`.
   - Remove the settings sheet’s separate `usePomodoroSettings()` instance, because it currently updates its own local state/localStorage while the timer pill keeps reading stale `25` from the parent hook.

2. Fix “Set this configuration”.
   - Keep sliders saving settings as before.
   - When tapped, call `applyCurrentSettings()` from the parent after the parent has the latest settings, so the pill changes from `25:00` to the selected value like `40:00` immediately.
   - Close the sheet after applying.

3. Change “Reset pomodoro cycle” to factory reset behavior.
   - Restore default Pomodoro settings: focus `25`, short break `5`, long break `15`, long break every `4`, default sound/volume/vibration.
   - Reset the current cycle/session back to focus mode and show `25:00` in the pill.

4. Keep existing settings UI functionality intact.
   - Sound test, vibration toggle, sliders, and Liquid Glass sheet positioning will remain unchanged.