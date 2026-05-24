# Pomodoro Fixes & Live Study Count

## 1. Bug: "Today focused" reports wrong minutes

**Problem:** When you edit the timer inline (e.g. set 1 min), the stats still log the *setting's* focus duration (25 min). In `use-pomodoro-timer.ts`, on completion we call `onComplete(currentMode, nextMode, minutesForMode(currentMode))` — that returns the **settings value**, ignoring inline edits.

**Fix:** Pass the actual session length using `totalTime / 60` (the value the timer was started with) instead of `minutesForMode(currentMode)`. This works for both inline edits and settings-driven durations.

## 2. Close (X) button discoverability

**Fix:** Add an accessible tooltip + visible micro-label on hover so users learn the X closes the Pomodoro pill.

- Wrap the X `Button` in `PomodoroTimer.tsx` with shadcn `<Tooltip>` showing "Close Pomodoro timer".
- Keep existing `aria-label="Hide Pomodoro Timer"` (rename to "Close Pomodoro timer" for consistency).
- Also add the same tooltip to the floating Timer icon (when hidden) saying "Show Pomodoro timer".

No layout change — same round X button, just a hover/long-press tooltip.

## 3. "Studying with N people right now" badge

Show how many users currently have the app open, live.

**Tech:** Supabase Realtime **Presence** (already available via Lovable Cloud — no new deps, no DB tables, no auth required; uses anonymous channel presence).

**New file:** `src/hooks/use-online-presence.ts`
- Joins a single channel `presence:studying`.
- Tracks an anonymous key (random id per tab) on mount, untracks on unmount.
- Returns `onlineCount` updated on `sync` event.
- Handles reconnects, cleans up on tab close.

**UI:** In `PomodoroTimer.tsx`, add a small badge next to the "Today: …" line:

```
Today: 1h 20m focused 🔥  •  👥 12 studying now
```

Themed using existing `styles.badge`. Hidden if count < 1 or presence fails.

## Files

- `src/hooks/use-pomodoro-timer.ts` — pass real completed minutes
- `src/components/PomodoroTimer.tsx` — tooltips on X/show buttons, render studying-now count
- `src/hooks/use-online-presence.ts` — new, Supabase Realtime presence hook

## Out of scope

- Per-subject or per-room presence (just one global "studying" channel)
- Showing who is online (privacy: count only, no identities)
- Stats history rewrite for past wrong entries
