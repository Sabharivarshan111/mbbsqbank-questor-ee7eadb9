# Fix cross-device sync

## What's actually broken

I traced both bugs to two underlying causes:

### 1. Reconcile is destructive and currently crashing
`reconcile_question_progress` (the function `use-profile.ts` calls every time you sign in or come back to the tab) treats **the device as the source of truth** and does:
- `DELETE FROM question_progress WHERE user_id = _uid AND question_id <> ALL (local_ids)` — deletes any cloud row not present on the current device
- Then `UPDATE public.profiles ... WHERE user_id = _uid` — but `profiles` has no `user_id` column (it's `id`). Console confirms: `column "user_id" does not exist`. There is also no `weekly_xp` column.

So on a fresh tablet (where localStorage has no ticked questions), the reconcile call is *trying* to wipe everything you ticked on your phone. Right now it crashes before the wipe lands, but the moment we touch other code it would, plus the crash means cloud progress also never reflects new ticks correctly.

### 2. Signing in on a second device doesn't carry the account/name
Flow on the tab today:
1. Onboarding asks for a name → creates a brand-new **anonymous** Supabase user.
2. `claim_or_merge_profile` only merges by `device_id`, which is unique per device, so nothing carries over.
3. Only after onboarding can the user notice the small "Sync with Email/Google" button inside Your Progress and link there. Most users never find it, so the tab keeps a fresh name/empty progress.

Even when they do find Email/Google sync, the `[userId]` effect in `use-profile.ts` then immediately calls `syncLocalProgressToCloud()` + `reconcileProgressWithCloud(true)`, which (per bug 1) tries to delete all the phone's cloud progress.

## Plan

### A. Make the cloud → local sync non-destructive (the core fix)

Rewrite `public.reconcile_question_progress(_question_ids text[])` to **merge** instead of overwrite:
- Insert any local IDs that aren't already in the cloud (`ON CONFLICT DO NOTHING`).
- Return the union of cloud IDs back to the client so the client can mark them done in localStorage.
- Recompute `profiles.xp` from `question_progress` (using the correct `id` column, dropping the bogus `weekly_xp` write).
- No `DELETE` of question rows. The only way a question gets un-ticked is the existing `record_question_undone` RPC, which the user triggers explicitly.

Change return type to `setof text` (the merged ID list) so `src/lib/question-progress.ts` can:
- Take the returned IDs.
- For each, set `localStorage["question-<id>"] = "true"` if missing.
- Dispatch `QUESTION_PROGRESS_EVENT` so the UI re-renders the ticked state.

### B. Pull cloud profile on auth change, not just on first mount

In `src/hooks/use-profile.ts`:
- Move the "load cloud profile + register_open + sync progress" block so it also runs when `userId` transitions from an anonymous user to a real (email/Google) user, replacing the local name/year with the cloud profile's name/year. Today the local onboarding name overrides the real account's name on the tab.
- Only call `syncLocalProgressToCloud()` *before* the merged reconcile, and rely on the new merged reconcile to fill in cloud → local.

### C. Make sign-in discoverable from onboarding

In `src/components/progress/OnboardingDialog.tsx` (and wherever the very first onboarding is triggered), add a secondary action under the "Save" button:

> Already have an account? **Sign in to sync**

Clicking it opens the existing Email OTP sign-in flow (and, where available, Google). After a successful sign-in:
- `merge_into_current_user` merges the just-created anonymous user into the existing account (already implemented).
- The new auth-change handler from step B refetches the cloud profile, so the tab immediately shows the phone's name, year, XP, streak, and ticked questions.
- Onboarding closes without forcing the user to type a throwaway name.

### D. Small consistency fix

`merge_into_current_user` already handles question_progress merging correctly. After it runs, trigger one more `reconcileProgressWithCloud(true)` from the client so the merged set syncs into localStorage on the new device.

## Files to change

- `supabase/migrations/<new>.sql` — replace `reconcile_question_progress` with the non-destructive merged version returning `setof text`.
- `src/lib/question-progress.ts` — consume returned IDs, write missing ones to localStorage, fire `QUESTION_PROGRESS_EVENT`.
- `src/hooks/use-profile.ts` — refetch cloud profile on auth change to a non-anonymous user; overwrite local name/year from cloud when signed in.
- `src/components/progress/OnboardingDialog.tsx` — add "Sign in to sync" entry point that opens the email/Google sign-in UI.
- `src/components/progress/EmailSyncButton.tsx` — after successful merge, also kick a `reconcileProgressWithCloud(true)` so cloud-only ticks land on this device immediately.

## What you'll see after the fix

- Tick a question on your phone → open the tab → sign in with the same email or Google → your name, streak, XP, and every ticked question appear within a second.
- Ticking on either device now adds to the cloud; nothing ever deletes the other device's ticks.
- Onboarding on a new device shows a "Sign in to sync" link so you don't have to hunt for it inside Your Progress.

No data loss risk: this only adds rows and reads rows, it never deletes question_progress.
