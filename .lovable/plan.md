# Fix toast position + background-safe pomodoro

## 1. Move notification pop-ups to the top

Toasts (streak, XP, congratulations) currently render at the bottom and overlap the Pomodoro timer card on mobile.

**Sonner toaster** (`src/components/ui/sonner.tsx`)
- Add `position="top-center"` to `<Sonner />` so all `toast(...)` calls from `sonner` appear at the top.

**Legacy shadcn toaster viewport** (`src/components/ui/toast.tsx`)
- Update the `ToastViewport` default classes from bottom anchoring (`sm:bottom-0`) to top anchoring (`top-0 sm:top-0`) and adjust the swipe direction utility classes so the slide-in animation comes from the top. Keep mobile full-width behavior.

No component using `toast(...)` needs to change — only the viewports.

## 2. Pomodoro keeps running when app is minimized / backgrounded

Today `usePomodoroTimer` decrements `remainingTime` via `setInterval(..., 1000)`. Mobile browsers throttle or pause timers when the tab/app is hidden, so when the user returns the timer appears "paused" and resumes from where it left off — losing the elapsed wall-clock time.

Fix by switching the timer to **wall-clock based** instead of tick-based.

### Changes in `src/hooks/use-pomodoro-timer.ts`

- Add a `runStartRef = useRef<{ startedAt: number; startRemaining: number } | null>(null)`.
- When `isRunning` flips to `true`, record `startedAt = Date.now()` and `startRemaining = remainingTime`.
- Inside the interval, compute `elapsed = Math.floor((Date.now() - startedAt) / 1000)` and set `newRemaining = startRemaining - elapsed` instead of `prev - 1`. This makes a throttled tick (e.g. one tick after 30s of background) immediately snap to the correct remaining time.
- On completion (`newRemaining <= 0`), use the same existing branch: mark not running, fire `onComplete` with the actual completed minutes computed from `totalTime`, advance mode.
- Add a `visibilitychange` listener: when `document.visibilityState === 'visible'` and `isRunning`, force-recompute remaining time from `runStartRef` immediately (so the UI updates the second the user reopens the app, without waiting for the next throttled tick). If the recomputed value is `<= 0`, run the same completion path used by the interval (extract it into a small `completeSession()` helper to avoid duplication).
- When the user pauses (`toggleTimer` to off), reset `runStartRef = null` and freeze `remainingTime` at its current value. When they resume, set a fresh `runStartRef` based on the now-current `remainingTime`.
- When `resetTimer`, `switchMode`, `resetCycle`, `applyCurrentSettings`, or `handleSubmit` run, clear `runStartRef`.

### Persist across full app close (mobile webview / browser kill)

To also survive the user fully closing and reopening the app:

- When `isRunning` becomes true, write `{ mode, totalTime, endsAt: Date.now() + remainingTime * 1000, pomodoroCount }` to `localStorage` under `pomodoro:session`.
- On hook mount, read that key:
  - If `endsAt > Date.now()`: restore `mode`, `totalTime`, `pomodoroCount`, set `remainingTime = Math.ceil((endsAt - Date.now())/1000)`, and set `isRunning = true` so it resumes ticking and the user sees the time it should be.
  - If `endsAt <= Date.now()`: treat as completed — restore mode/count, run the completion path once (so streak/XP toast fires and mode advances), then clear the key.
- Clear the key on pause, reset, mode switch, and successful completion.

### Notes

- No DB, RLS, or new dependencies. No edge functions. No backend changes.
- Existing audio + `onComplete` callbacks (XP, water count, etc.) keep firing through the same `completeSession()` helper.
- The timer card UI in `PomodoroTimer.tsx` does not need changes — it already reads `remainingTime`, `minutes`, `seconds`, `isRunning` from the hook.

## Files touched

- `src/components/ui/sonner.tsx` — `position="top-center"`.
- `src/components/ui/toast.tsx` — viewport anchored to top.
- `src/hooks/use-pomodoro-timer.ts` — wall-clock ticking, visibility listener, localStorage persistence.
