## Goal
Show today's calendar event(s) as a small reminder line inside the Pomodoro pill, just below the "Today: 0m focused 🔥" line — only if a reminder exists for today. If there's no event for today, render nothing (no extra line, no placeholder).

## Changes

**`src/components/PomodoroTimer.tsx`**
- Get the current user id (use the existing pattern via `useProfile` already used elsewhere in this file or a `supabase.auth` lookup — whichever is already imported).
- Call `useCalendarEvents(userId)` to get `events`.
- Compute `todayEvents` = events whose `event_date` equals today's date (`yyyy-MM-dd` via `date-fns/format`).
- Below the existing "Today: ... focused 🔥" line, conditionally render a small line:
  - Only when `todayEvents.length > 0`.
  - Format: `📌 <title>` for one event, or `📌 <title1> • <title2>` (joined) for multiple — capped to first 2 with "+N more" if more.
  - Same small style as the focused line (`text-[11px] opacity-80 ${styles.text}`), centered, single line with truncation.
- Important if any event is `important` → keep same style, no color change (matches user's "don't change anything else" preference).

## Out of scope
- No changes to mini pill, settings sheet, calendar tab, DB, or styling of existing pill content.
- No new event creation UI here — reminders are added from the existing calendar tab.
