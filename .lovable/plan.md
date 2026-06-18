## Goal

1. Ensure question ticks/unticks (done + undone counts) sync to Supabase in realtime across devices when signed in (Google or email OTP).
2. Add two new sub-tabs inside the Progress tab: **Calendar** and **Notes**, both cloud-synced live across devices.

---

## 1. Question progress realtime sync

Already persisted in `question_progress` via `record_question_done` / `record_question_undone` RPCs. Add:

- Enable Realtime publication on `question_progress` and `profiles`.
- In the progress/question hooks, subscribe to `postgres_changes` on `question_progress` filtered by `user_id = auth.uid()` and invalidate React Query caches so ticked/unticked counts (and XP) update live on every signed-in device.

No schema changes to existing tables.

---

## 2. New tables

**`calendar_events`**
- `user_id uuid` (auth.uid)
- `event_date date`
- `title text`
- `important boolean default false`
- standard id/created_at/updated_at
- RLS: owner-only ALL
- Added to `supabase_realtime` publication

**`user_notes`**
- `user_id uuid`
- `title text`
- `content text` (rich text / plain)
- `drawing_path text` (storage path, nullable — for drawing PNG)
- `kind text check in ('text','drawing','mixed')`
- standard id/created_at/updated_at
- RLS: owner-only ALL
- Added to `supabase_realtime` publication

GRANTs for both tables: authenticated (SELECT/INSERT/UPDATE/DELETE), service_role ALL.

**Storage bucket `note-drawings`** (private), with RLS on `storage.objects`:
- Users can read/write/delete files only under a folder matching their `auth.uid()` (`(storage.foldername(name))[1] = auth.uid()::text`).

---

## 3. Progress tab UI

Inside `ProgressDashboard`, add a small secondary tab strip (shadcn `Tabs`) with three tabs:
- **Stats** (existing dashboard content)
- **Calendar**
- **Notes**

### Calendar tab (`ProgressCalendarTab.tsx`)
- shadcn `Calendar` (single mode) with `pointer-events-auto`.
- Dots/badges on days that have events; star on important days.
- Below the calendar: list of events for the selected date with add/edit/delete + "important" star toggle.
- Realtime channel on `calendar_events` filtered by user_id; React Query invalidation on insert/update/delete.

### Notes tab (`ProgressNotesTab.tsx`)
- Free-form notes list (newest first), search by title.
- Each note: title + textarea for typed content + "Draw" button opening a canvas dialog.
- Drawing dialog: simple `<canvas>` with pen color, stroke width, clear, save. On save → upload PNG to `note-drawings/{uid}/{noteId}-{ts}.png`, store path in `drawing_path`.
- Realtime channel on `user_notes` filtered by user_id; cache invalidation on changes.

---

## 4. Auth compatibility

All new features rely solely on `auth.uid()`, so they work identically for Google sign-in and email-OTP sign-in. No changes to existing auth flow. After `merge_into_current_user`, future migration can extend it to also move `calendar_events` and `user_notes` rows — included in this plan.

---

## Technical details

- Files to create:
  - `src/components/progress/ProgressCalendarTab.tsx`
  - `src/components/progress/ProgressNotesTab.tsx`
  - `src/components/progress/DrawingCanvas.tsx`
  - `src/hooks/useCalendarEvents.ts`
  - `src/hooks/useUserNotes.ts`
  - `src/hooks/useQuestionProgressRealtime.ts`
- Files to edit:
  - `src/components/progress/ProgressDashboard.tsx` — add inner Tabs.
  - `src/hooks/useProgress.ts` (or equivalent) — subscribe to realtime for question_progress.
- One migration: create both tables + grants + RLS + add all three tables to `supabase_realtime`, extend `merge_into_current_user` to include them.
- One storage bucket via `supabase--storage_create_bucket` + RLS migration on `storage.objects`.

No existing feature (Google sign-in, email OTP, XP, leaderboard, streak) is touched.