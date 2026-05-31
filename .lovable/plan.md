## First-Time Walkthrough Tour (Expanded)

A guided onboarding overlay that appears only on the user's very first visit and never again. Persisted in `localStorage` under `orbit-walkthrough-completed`.

### How it works

- On app mount, check the flag. Missing → show overlay. Finish/skip → set flag → never shows again.
- Full-screen dim layer with a spotlight cut-out around the target element + tooltip card (title, description, optional GIF-free animated hint icon, and `Skip` / `Back` / `Next`; last step = `Got it!`).
- Smooth-scrolls the target into view, recomputes rect on resize/scroll.

### Walkthrough steps (11 screens)

1. **Welcome** — Centered card. "Welcome to ORBIT MBBS QBANK — let's take a quick tour."
2. **Question Bank** — Spotlight QBank section. "Browse thousands of MCQs & short answers across every MBBS subject."
3. **Expand AI Chat** — Spotlight AiChat panel + its expand button. "Ask any medical question. Tap the expand icon to open AI chat in a bigger view."
4. **Theme Toggle — Light / Dark / Custom** — Spotlight `ThemeToggle`. "Tap to switch themes. Choose Light, Dark, or open **Custom Theme** to pick your own colors and save it."
5. **Create Your Own Theme** — Still on ThemeToggle. "Inside Custom Theme, pick background, foreground, and accent colors with the color pickers, then Save — your theme applies instantly."
6. **Change Font Size** — Spotlight `FontSizeToggle`. "Tap A− / A+ to change font size (small / medium / large) across the whole app."
7. **Pomodoro Pill** — Spotlight the floating Pomodoro pill. "This is your study timer. Tap once to start/pause."
8. **Drag the Pill** — Same target. "**Touch and hold**, then drag to move the pill anywhere on screen."
9. **Pomodoro Settings** — Spotlight the settings (gear) icon on the pill. "Tap the gear to open settings — change focus / break durations, sound, and vibration. Use **Set this configuration** to apply, or **Reset pomodoro cycle** to restore defaults."
10. **Close the Pomodoro Timer** — Spotlight the close (×) button on the pill. "Tap × to hide the timer. You can bring it back anytime from the page."
11. **Report an Issue** — Spotlight the creator name pill in the footer ("Sabharivarshan S"). "Found a bug or have feedback? **Tap the creator's name** in the footer to report any issue."

Final step → flag saved → overlay unmounts.

### Technical details

- New: `src/components/walkthrough/Walkthrough.tsx` — overlay component. Uses `useLocalStorage('orbit-walkthrough-completed', false)`, `stepIndex` state, looks up target by `data-tour="..."` selector via `getBoundingClientRect()`, renders a fixed `inset-0 z-[100]` layer. Spotlight uses `box-shadow: 0 0 0 9999px hsl(var(--background) / 0.88)` on a rounded rect around the target, plus `ring-2 ring-primary`. Tooltip card auto-flips above/below target based on viewport space (mobile-aware, 384px viewport in mind).
- New: `src/components/walkthrough/walkthroughSteps.ts` — array of `{ id, title, description, targetSelector?, placement? }`. Steps without a selector render as centered modal (welcome step).
- Edit `src/pages/Index.tsx`: mount `<Walkthrough />` at the bottom; add `data-tour` attributes to: question bank wrapper (`question-bank`), AI chat wrapper (`ai-chat`), theme toggle (`theme-toggle`), font size toggle (`font-size`), creator-name link (`report-issue`).
- Edit `src/components/PomodoroTimer.tsx`: add `data-tour="pomodoro-pill"` to the pill root, `data-tour="pomodoro-settings"` to the settings/gear button, `data-tour="pomodoro-close"` to the close button. (If close/settings buttons are inside child components, add the attribute there.)
- Styling: semantic tokens only — `bg-card text-card-foreground border-border` for tooltip, `bg-primary text-primary-foreground` for primary action, `text-muted-foreground` for Skip. Rounded `2xl`, soft shadow.
- Accessibility: `role="dialog"`, focus trap on the tooltip card, `Esc` to skip, arrow keys for prev/next.

### Out of scope

- No "Replay tour" entry point (per earlier ask: only first time, never again). Easy to add later behind a footer link if you change your mind.
- No backend storage; per-device only — matches "first install" intent.
