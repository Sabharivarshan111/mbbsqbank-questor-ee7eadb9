## Scope

Two features, no backend changes required.

1. **Export Notes as PDF** — download button on every note (typed + drawing).
2. **Local Push Notifications** — Pomodoro end, calendar reminder (10 min before), daily target nudge, streak-at-risk warning. On-device only, no Firebase.

---

## 1. Export Notes as PDF

### User flow
- In the Notes tab, every note card gets a small **⬇ PDF** icon next to the existing edit/delete buttons.
- Tap → generates an A4 PDF named `<note-title>-orbit.pdf` and triggers a download (web) or opens the share sheet (Android via Capacitor).
- PDF contains: note title, date, the typed content (formatted), the drawing canvas (if present) as an embedded image, and a small footer "Made with Orbit MBBS QBank · orbit.app".

### Implementation
- Install `jspdf` and `html2canvas` (~150 KB combined, client-side only).
- New file `src/lib/note-pdf-export.ts` exposing `exportNoteToPdf(note)`:
  - Builds an off-screen styled div with the note's HTML.
  - Uses `html2canvas` to rasterise typed content; paginates if taller than A4.
  - If the note has a drawing, snapshots the existing canvas via `canvas.toDataURL('image/png')` and adds it on a new page.
  - On native (Capacitor), uses `@capacitor/filesystem` + `@capacitor/share` to save to Documents and open share sheet. On web, triggers a normal anchor download.
- Edit `src/components/progress/ProgressNotesTab.tsx` to add the PDF button per row and call the helper.

### Constraints
- No edits to other tabs or business logic.
- Works offline.

---

## 2. Local Push Notifications (Capacitor)

### Triggers covered
| Trigger | When it fires |
|---|---|
| 🍅 Pomodoro end | Exactly when the active focus/break timer hits 0, even if app is backgrounded |
| 📌 Calendar reminder | 10 minutes before each `calendar_events` row's start time (today + upcoming) |
| 🎯 Daily target | Once at 19:00 IST if `questions_today < daily_target` |
| 🔥 Streak at risk | Once at 21:00 IST if user hasn't opened the app today and streak ≥ 2 |

### Implementation
- Install `@capacitor/local-notifications`. Run `npx cap sync` (user-side step, will be noted in the closing message).
- New file `src/lib/notifications.ts`:
  - `ensurePermission()` — requests permission on first app open after install.
  - `scheduleOne({ id, title, body, at })` — wraps `LocalNotifications.schedule`.
  - `cancel(id)` — wraps `LocalNotifications.cancel`.
  - Stable integer IDs per category (Pomodoro=1, target=2, streak=3; calendar events use `1000 + hash(event.id) % 100000`).
- **Pomodoro integration** (`src/components/PomodoroTimer.tsx`):
  - On timer start: schedule notification at `Date.now() + remainingMs`.
  - On pause/reset/skip: cancel id 1.
- **Calendar integration** (new `src/hooks/use-notification-sync.ts`, mounted once in `App.tsx`):
  - Subscribes to `calendar_events` realtime; on every change, cancels all calendar IDs and re-schedules today + next 7 days at `event.start - 10 min`.
  - Skips events already in the past.
- **Daily target + streak** (same hook):
  - On app open and every 30 min, computes target gap and last-open date; schedules/cancels the 19:00 and 21:00 IST notifications for today.
- **Web fallback**: the helper no-ops on web (already toast-driven). Notifications fire only inside the Capacitor APK.

### Settings (small addition)
- One toggle row in the existing profile area: **"Reminders & alerts"** (on by default). When off, all schedules are cancelled and no new ones are queued. Persisted in `localStorage` under `orbit.notif.enabled`.

### Constraints
- No FCM, no Firebase, no server, no new Supabase tables.
- No changes to XP, ranking, or other features.

---

## File checklist

**New**
- `src/lib/note-pdf-export.ts`
- `src/lib/notifications.ts`
- `src/hooks/use-notification-sync.ts`

**Edited**
- `src/components/progress/ProgressNotesTab.tsx` — PDF button
- `src/components/PomodoroTimer.tsx` — schedule/cancel on timer events
- `src/App.tsx` — mount `useNotificationSync()` and `ensurePermission()`
- `package.json` — `jspdf`, `html2canvas`, `@capacitor/local-notifications`

**User action after build**
- `git pull` → `npm install` → `npx cap sync android` → rebuild APK. Notifications need this once for the new native plugin.
