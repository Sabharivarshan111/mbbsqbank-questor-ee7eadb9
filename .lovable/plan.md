## 1. Cross-device progress sync (phone tick not showing on tablet)

**Root cause:** Today the app only pushes local → cloud. `reconcileProgressWithCloud` even treats the local device as source of truth and *deletes* server rows missing locally. So when you open the tablet (fresh localStorage), the cloud rows aren't pulled down, and worse, a reconcile can wipe the phone's ticks from the cloud.

**Fix — add cloud → local pull and make reconcile non-destructive:**

- `src/lib/question-progress.ts`
  - Add `pullCloudProgressToLocal()`:
    - `SELECT question_id FROM question_progress WHERE user_id = auth.uid()`
    - For each returned id, `localStorage.setItem(id, "true")` if not already true.
    - Dispatch `QUESTION_PROGRESS_EVENT` so all counters/ticks refresh.
  - Replace the destructive `reconcileProgressWithCloud` flow with a merge:
    1. `pullCloudProgressToLocal()` (cloud → local).
    2. `syncLocalProgressToCloud()` (local → cloud, additive only via `record_questions_done`).
    3. Skip the `reconcile_question_progress` RPC (no auto-deletion). Un-ticks already call `record_question_undone` explicitly when the user un-ticks on a device.

- `src/hooks/use-profile.ts`
  - On sign-in and on `visibilitychange → visible`, call the new merge instead of the old reconcile, so the tablet pulls down ticks made on the phone and vice-versa.

Result: ticking on the phone shows up on the tablet within a couple of seconds of opening the app (or when it becomes visible), and no device can silently delete another device's ticks.

## 2. Auto-minimize Pomodoro when opening Your Progress / Study Materials

- `src/components/QuestionBank.tsx`
  - In the `Tabs` `onValueChange` handler, when the new tab is `"progress"` or `"materials"`, dispatch `window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"))`. For `"essay"`/`"short-notes"` do nothing (so the pill stays where the user left it).

- `src/components/PomodoroTimer.tsx`
  - Add a listener for `orbit:hide-pomodoro` that calls `setIsVisible(false)` (collapses the pill to the small floating circle the user can tap to re-open). Pair it with the existing `orbit:show-pomodoro` listener — no new visual code needed; the minimized circle UI already exists.

No other behavior changes; reminder line, themes, and existing Pomodoro logic stay as-is.
