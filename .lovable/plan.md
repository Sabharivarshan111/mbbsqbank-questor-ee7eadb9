
# Plan: Security hardening + cross-device email-OTP linking

## Part A — Security fixes

You chose to keep current Realtime behavior, so the Realtime-channel finding will be **accepted as a known risk** and recorded in security memory. Everything else gets a proper fix.

### 1. Lock down direct table reads (still leaves leaderboards working via existing RPCs)

- `profiles`: replace `Profiles readable by any authenticated user` (USING true) with `USING (auth.uid() = id)`. Cross-user data is served via SECURITY DEFINER RPCs only.
- `weekly_xp`: replace `Weekly xp readable by authenticated` with `USING (auth.uid() = user_id)`.
- `screen_time`: replace `screen_time readable by authenticated` with `USING (auth.uid() = user_id)`.

### 2. Replace direct profile reads in the "all" leaderboard

- Add a new SECURITY DEFINER function `public.get_overall_leaderboard(_limit int default 50)` returning `id, display_name, year, xp, streak` only (no `device_id`).
- Update `src/hooks/use-leaderboard.ts` "all" branch to call this RPC instead of `from("profiles").select(...)`.

### 3. Drop the unused SECURITY DEFINER view

- `DROP VIEW public.weekly_leaders;` (not referenced anywhere in `src/`).

### 4. Tighten SECURITY DEFINER function grants

- Revoke `EXECUTE` from `anon` on every `public.*` SECURITY DEFINER function (they all require `auth.uid()` anyway). Grant `EXECUTE` to `authenticated` (and `service_role`) for the ones called from the app: `claim_or_merge_profile`, `record_question_done`, `record_questions_done`, `record_question_undone`, `register_open`, `record_screen_time`, `reconcile_question_progress`, `get_year_lifetime_xp`, `get_year_leaderboard`, `get_weekly_leaderboard`, and the new `get_overall_leaderboard`, `link_profile_by_email` (added in Part B).
- The remaining "SECURITY DEFINER callable by authenticated" warnings are intentional and will be marked as ignored with explanation.

### 5. Leaked password protection

- Enable in Supabase Auth settings (this is a dashboard toggle; I'll point you to it after the migration runs since it's not changeable via SQL).

### 6. Accept Realtime risk

- Keep `profiles`, `question_progress`, `weekly_xp`, `screen_time` in the `supabase_realtime` publication. Add a note to security memory that any authenticated user can subscribe to row-change events, and that this is accepted to preserve live leaderboard updates.

## Part B — Cross-device linking via email OTP

Today: progress is keyed to `device_id` and an anonymous Supabase user. Two devices = two profiles.
After: a user can attach an email to their anonymous account on Device A, then on Device B sign in with the same email (OTP) — Device B's local progress is **merged into** the email-linked account.

### Database

- Add nullable `email` column on `public.profiles` for display (the source of truth stays `auth.users.email`).
- New SECURITY DEFINER RPC `public.merge_into_current_user(_old_user_id uuid)`:
  - Verifies the caller is authenticated.
  - Moves `question_progress`, `weekly_xp`, `daily_activity`, `screen_time` from `_old_user_id` into `auth.uid()` using the same conflict-resolution logic already in `claim_or_merge_profile`.
  - Carries over `streak`/`last_active_date` (keeps the larger / newer).
  - Recomputes `profiles.xp` from `question_progress`.
  - Deletes the old profile row.
  - Authorization: only allows merging an `_old_user_id` that has the same `device_id` as the current user OR that was just authenticated via the same email (we restrict by passing the old uid we already control in code; RLS plus the SECURITY DEFINER function ensures only signed-in users can call it).

### Auth flow (frontend)

New screen `src/pages/LinkAccount.tsx` and a "Link to email" button inside Settings/Profile:

1. **Device A (attach email to anonymous account):**
   - `supabase.auth.updateUser({ email })` → Supabase sends a 6-digit OTP via email.
   - User enters the code → `supabase.auth.verifyOtp({ email, token, type: 'email_change' })`.
   - Profile row updated with `email` for display.

2. **Device B (sign in with the same email):**
   - Capture current anonymous `userId` as `oldUserId` (we still have a session).
   - `supabase.auth.signInWithOtp({ email })` → 6-digit code.
   - User enters the code → `verifyOtp({ email, token, type: 'email' })` → session is now the email-linked account.
   - Immediately call `merge_into_current_user(oldUserId)` → Device B's progress moves into the linked account.
   - Update local `device_id` mapping; clear stale local profile.

### Email delivery

- Use Lovable's built-in auth emails. Supabase sends the OTP code automatically (uses default templates).
- No external email provider, no Resend setup. (We can brand the OTP email later via `scaffold_auth_email_templates` if you want — not in this plan.)

### Files

- New migration (Part A + Part B SQL).
- New: `src/pages/LinkAccount.tsx`, `src/hooks/use-link-account.ts`.
- Edit: `src/hooks/use-leaderboard.ts` (use `get_overall_leaderboard`), `src/hooks/use-profile.ts` (expose email + link entry), `src/App.tsx` (route `/link-account`), and the existing profile/settings panel to surface the "Link devices" button.
- Update `mem://index.md` + new memory note for account linking flow.

## Technical details

- New SQL revokes:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<each fn>(...) FROM anon, PUBLIC;
  GRANT  EXECUTE ON FUNCTION public.<each fn>(...) TO authenticated, service_role;
  ```
- `get_overall_leaderboard` body mirrors `get_year_leaderboard` minus the year filter, returning only `id, display_name, year, xp, streak`.
- Merge function reuses the body of `claim_or_merge_profile`'s second branch, parameterized by `_old_user_id` instead of `device_id` lookup.
- `verifyOtp` types: use `'email_change'` when attaching an email to an existing session, and `'email'` for fresh sign-in OTP.
- Leaked-password protection: I can't toggle this from SQL — after the migration I'll give you a one-click link to enable it in the Supabase Auth dashboard.

## Out of scope

- Branded custom OTP email template (default Supabase template is fine; can be added later).
- Google sign-in (you picked email-only).
- Realtime channel scoping (you chose to keep current behavior).

