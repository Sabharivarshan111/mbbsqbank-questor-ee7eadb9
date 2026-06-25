# Cross-device sign-in: identity conflict prompt

## Goal
When you sign in (Google or email OTP) on a second device, and that device has a different locally-typed name or year than your cloud profile, show a clear dialog asking which identity to keep. Question ticks/XP always merge automatically (current behavior — no change).

## Behavior

1. User signs in on Device B.
2. Right after auth, fetch the existing cloud `profiles` row for the signed-in user.
3. Compare cloud `display_name` / `year` with the local profile on Device B.
4. **If they match** → silent, no dialog. Proceed with merge + pull (today's flow).
5. **If they differ** → open an `IdentityConflictDialog`:

   ```text
   You're signed in as:
     Cloud:   Alex  ·  Final Year
     This device:  Bob  ·  Second Year

   Which one should we keep?
     [ Keep cloud (Alex / Final) ]   [ Use this device (Bob / Second) ]
   ```

6. Choice handling:
   - **Keep cloud** → overwrite local profile with cloud values. No DB write.
   - **Use this device** → `UPDATE profiles SET display_name = <local>, year = <local> WHERE id = auth.uid()`, then refresh local from cloud so both match.
7. Either way, immediately run the existing `merge_into_current_user` + `pullCloudProgressToLocal()` so ticks/XP/notes/calendar consolidate.

## Files touched

- `src/components/progress/IdentityConflictDialog.tsx` *(new)* — small shadcn `AlertDialog` with two buttons; props: `cloud`, `local`, `onChoose(which)`.
- `src/hooks/use-profile.ts` — after sign-in, fetch cloud profile, diff against local, open dialog when mismatched. Gate the existing merge/pull on the user's choice. Expose `pendingConflict` state to render the dialog from `ProgressDashboard`.
- `src/components/progress/ProgressDashboard.tsx` — render `IdentityConflictDialog` when `pendingConflict` is set.
- `src/components/progress/EmailSyncButton.tsx` / `GoogleSyncButton.tsx` — no logic change; they already go through `use-profile` so the dialog flows automatically.

## Technical notes

- Comparison is case-insensitive on `display_name.trim()`; year uses exact enum match.
- If the cloud profile doesn't exist yet (first ever sign-in for that auth user), skip the dialog and just push the local name/year up — that's not a conflict.
- The merge RPC stays exactly as it is. We only change which `display_name` / `year` ends up on the row; ticks always merge.
- Dialog is non-dismissable (no outside-click close) so the user must choose, preventing an indeterminate state.

## Out of scope
- No changes to question_progress, weekly_xp, daily_activity, screen_time, calendar_events, or user_notes logic.
- No new RPC; we use a plain `UPDATE` from the client (RLS already restricts to `auth.uid() = id`).
