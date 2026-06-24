
## Goals

1. Stop the Progress tab from re-asking you to sign in every time you switch tabs and come back.
2. Fix Google Sign-In in the Android APK (currently fails / resets).
3. Make the Leaderboard clearly require sign-in, with a friendly "migrate to a signed-in account" warning instead of just hiding it.

## What's actually wrong (diagnosis)

**A. "Asks me to sign in again when I click Progress after using another tab"**

In `src/hooks/use-profile.ts`:
- `needsOnboarding` is initialized to `!readLocal()` — true whenever the local profile (`orbit-profile-v1`) is missing.
- When you sign in via Google or email **without** going through onboarding first, no local profile is written. Then on every remount of `ProgressDashboard` (which happens when you navigate to another tab and come back), `useProfile` re-runs, `readLocal()` returns `null`, and the **Onboarding dialog opens again** — which is what you're seeing as "asks me to sign in again".
- The cloud profile *does* load and write local a moment later, but by then the dialog is already on screen.

**B. Google Sign-In broken on Android APK**

In `capacitor.config.ts` the GoogleAuth plugin has a placeholder client ID:
```
clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com'
```
So the native picker throws, and the fallback opens a browser redirect to `app.lovable.orbitmbbs://auth/callback` — a scheme that isn't registered in the Android manifest of the published APK. Result: the browser opens Google, comes back, nothing happens, session is lost. Email sign-in still works because it doesn't use the deep link.

**C. Service worker (`public/sw.js`) is cache-first for everything**

It intercepts every request including Supabase auth calls and falls back to a generic 404 on network errors. This can cause stale shells and the occasional broken auth refresh in the APK WebView. Not the main cause, but worth scoping the SW to same-origin GETs.

**D. Leaderboard**

`Leaderboard.tsx` already shows a sign-in card when `enabled=false`, but the message is generic. User wants: clearly tell non-signed-in users their progress lives only on this device, and ask them to sign in (email or Google) so their XP carries across devices.

## Plan

### 1. `src/hooks/use-profile.ts` — stop reopening onboarding on every remount

- Initialize `needsOnboarding` to `false` if **either** a local profile exists **or** there's already a Supabase session (we'll know shortly). Concretely:
  - Keep `needsOnboarding = !readLocal()` as a fast-path,
  - In the auth-watch `useEffect`, when a session resolves with a `user.id`, set `needsOnboarding(false)` immediately (the cloud-load effect will then fill in name/year). Onboarding will only re-open if the cloud profile load comes back empty AND no local profile exists.
- In the cloud-load effect: if `data` is `null` and no local profile exists, set `needsOnboarding(true)`; otherwise keep it `false`.
- Result: after email/Google sign-in, navigating to other tabs and back to Progress never reopens the onboarding dialog.

### 2. `src/components/progress/EmailSyncButton.tsx` and `GoogleSyncButton.tsx` — write local profile from cloud immediately after sign-in

- After a successful sign-in, fetch the cloud profile once and call `writeLocal({display_name, year})` so subsequent remounts have a local profile to read. (Belt-and-braces with #1.)

### 3. `src/lib/native-auth.ts` — make Google fallback more robust + clearer failure path

- Detect the placeholder client ID (`YOUR_GOOGLE_WEB_CLIENT_ID`) and skip the native plugin entirely so we don't burn a confusing error.
- If the deep-link fallback also can't be honored (no registered scheme), surface a toast: "Google Sign-In isn't available on this build — please update from the Play Store, or use Email sign-in."
- No change to email sign-in flow.

> Note: Fully restoring native Google Sign-In requires a real Google Web Client ID in `capacitor.config.ts` and a new APK build. That's a Play Store update, not a code-only fix. The UI will tell users that explicitly (on Android only) — which matches what you asked for last turn.

### 4. `public/sw.js` — scope service worker to same-origin GETs

- Bypass the cache for:
  - Non-GET requests,
  - Cross-origin requests (Supabase auth, RPC, storage),
  - Requests whose URL path starts with `/auth` or contains `supabase`.
- Keeps offline shell, removes interference with auth refresh in the APK WebView.

### 5. `src/components/progress/Leaderboard.tsx` — stronger "sign in to join" card

Replace the current `!enabled` block with:
- Trophy icon + heading **"Sign in to join the Leaderboard"**.
- Body: "Your progress is currently saved only on this device. Sign in with Email or Google above so your XP, streaks and rank carry across all your devices."
- Yellow warning chip: **"Without signing in, your name and XP won't appear on the leaderboard, and you'll lose your progress if you uninstall the app or clear browser data."**
- Keep the existing Android-only Play Store update card underneath.

### Out of scope

- Real Google Web Client ID + AndroidManifest scheme registration (requires user-provided ID and a new APK build).
- Any DB / RLS / edge function changes.
- Leaderboard data shape, ranking logic, or sub-components.

## Files touched

```text
src/hooks/use-profile.ts                          (onboarding gating)
src/components/progress/EmailSyncButton.tsx       (write local after sign-in)
src/components/progress/GoogleSyncButton.tsx      (write local after sign-in)
src/lib/native-auth.ts                            (robust fallback + toast)
public/sw.js                                      (scope to same-origin GETs)
src/components/progress/Leaderboard.tsx           (stronger sign-in card)
```
