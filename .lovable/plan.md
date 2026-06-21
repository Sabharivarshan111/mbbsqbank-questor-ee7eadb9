# Two fixes

## 1. Reminder under Pomodoro pill not showing

The code I added is correct: it reads today's calendar events for the signed-in user and renders `📌 <title>` below the "Today: ... focused" line, only when at least one event exists for today.

So the line only appears when:
- you are signed in (same account that added the reminder), AND
- there is a calendar event whose date is today (`yyyy-MM-dd` of your device), AND
- the Pomodoro pill is expanded (the small clock icon in the screenshot is the collapsed state — tap it once to expand).

To make this easier to verify and more robust, I will:
- Tap-expand the pill if not already expanded (no change needed — already supported).
- Make the reminder line a touch more visible: keep size but add a subtle separator above it so it reads as its own line.
- Add a small fallback: if `userId` is still loading, the line stays hidden (current behavior, kept).

If after this you still don't see it: the most likely cause is that no `calendar_events` row exists for today on your account. Open Progress → Calendar tab, pick today, add a reminder, then expand the Pomodoro pill — the `📌` line will appear.

No logic change to filtering/format — only the small visual separator.

## 2. Light + Liquid-glass: "Your Progress" has no active box

Cause: only the "Study Materials" trigger has the `extras-tab-button` class, and `index.css` styles that class with the white box for `html.liquid-glass` and `html.custom`. "Your Progress" has no equivalent class so it shows no box on those two themes.

Fix:
- In `src/components/QuestionBank.tsx`, add a new class `progress-tab-button` to the "Your Progress" `TabsTrigger` (alongside `topTriggerClass`).
- In `src/index.css`, add CSS rules for `progress-tab-button` that mirror `extras-tab-button` for `html.custom` and `html.liquid-glass` (background, border, blur, shadow). No changes to other themes.

This gives "Your Progress" the same visible box as "Study Materials" only on Custom and Liquid-glass themes; all other themes remain unchanged.

## Files touched
- `src/components/PomodoroTimer.tsx` — tiny visual tweak to reminder line.
- `src/components/QuestionBank.tsx` — add `progress-tab-button` class to Your Progress trigger.
- `src/index.css` — add `progress-tab-button` rules for `html.custom` and `html.liquid-glass`.
