# Handoff — Orbit MBBS native Android app

**Last updated:** 2026-08-15

Written so a fresh session (or a different person) can pick this up without the
prior conversation. Read `CLAUDE.md` too — it lists the traps.

---

## 1. What was asked for, and what exists now

The app was a Vite/React web app shipped to Play inside a Capacitor WebView.
The goal was a **genuinely native** Android app in React Native — not a
WebView wrapper.

That exists, in `mobile/`. Verified: the release JS bundle is ~3.8 MB, contains
the full question bank, and has **zero WebView references**. Screens are native
Android views on Hermes.

The web app in the repo root is untouched and still live.

### Ported and working

| Area | Notes |
|---|---|
| Home | hero carousel, quick actions, gradient subject cards, streak + focus stats |
| Question bank | year → subject → paper → topic → questions, any nesting depth |
| Question rows | tick to complete, importance stars, page refs, "ask AI" |
| Search | full-text across all 5,523 questions |
| Notes | year → subject → topic → **batched AI notes generation**, refine, regenerate |
| Timer | wall-clock pomodoro, survives backgrounding, per-day + lifetime stats |
| Ask AI | same `ask-gemini` edge function as web |
| My Progress | profile, year ring, streak/level, rewards, heatmap, subjects, leaderboard |
| Profile | name + year editor, doubles as first-run onboarding |
| Auth | Google Sign-In → Supabase `signInWithIdToken`; anonymous otherwise |
| Ads | AdMob interstitial + rewarded, web app's 3-bucket daily policy |

### Deliberately not done

- **Razorpay payments** — not ported. Web app has it (`supabase/functions/razorpay-*`).
- **Calendar and saved-notes tabs** on My Progress — placeholders.
- **react-native-webview** — omitted on purpose; the app renders natively.
- **Play Integrity** — the console shows verdicts enabled, but the app never
  calls the API. Enabling it properly needs server-side verification in the
  edge functions. Not a console switch.

---

## 2. Blocking items — do these first

### 2.1 Upload key reset (blocks all releases)

The original upload key belongs to **Google AI Studio**, not to the developer.
The upload certificate is self-signed `CN=AI Studio, O=Google`, so there was
never a keystore on the developer's machine. CI cannot sign a release until
this is resolved.

Play App Signing **is** enabled (deployment cert is Google's
`CN=Android, O=Google Inc.`), so an upload key reset is possible and users are
unaffected.

**Status:** a replacement keystore was generated and handed to the developer
(`upload-keystore.jks`, alias `upload`), along with `upload_certificate.pem`.
Awaiting: developer submits the `.pem` via Play Console → Test and release →
Setup → App signing → *Request upload key reset* (1–2 business days).

The keystore and its password are **not in this repo** and must never be.

### 2.2 Leaked OpenAI API key

GitHub push protection found a live **OpenAI API key** committed at
`src/components/AIChatWindow.tsx:14` (commit `f50c8e8`). The file is already
deleted from HEAD, but the key remains in the original repo's history.

- Purged from `gmck`'s history via `git filter-repo` (see §5).
- **Still present in `mbbsqbank-questor-ee7eadb9` history.**
- **Action: revoke the key at platform.openai.com.** Not done as of writing.

### 2.3 Google Cloud OAuth SHA-1s

Sign-in only works if Google Cloud has an Android OAuth client whose SHA-1
matches the certificate that signed the running build.

| Certificate | SHA-1 | Still needed? |
|---|---|---|
| Deployment (Play App Signing) | `54:F7:27:F7:21:AD:9D:36:3A:42:4C:85:F4:B9:7A:25:A2:E3:FB:D5` | **Yes — this is what real users run** |
| New upload key | `CE:EA:8A:41:BB:07:78:C4:78:26:D8:8F:CC:E0:2C:C9:EB:29:40:68` | Yes, after the reset lands |
| Old upload (AI Studio) | `65:C0:36:DE:45:8B:20:58:33:E4:84:0D:09:79:AD:F1:07:6A:76:05` | Stops mattering after reset |

Missing the deployment one is the classic failure: sign-in works in testing and
fails for every real user.

---

## 3. Identifiers and configuration

| Thing | Value | Where |
|---|---|---|
| App name | Orbit MBBS | `mobile/app.json`, `strings.xml` |
| applicationId / namespace | `com.aistudio.mbbsqbank.aycxvd` | `mobile/android/app/build.gradle` |
| versionCode / versionName | 14 / `0.0.0.14` (13 is live) | same |
| minSdk / targetSdk | 24 / 36 | `mobile/android/build.gradle` |
| Deep-link scheme | `com.aistudio.mbbsqbank.aycxvd` | manifest intent-filter |
| Google Web Client ID | `358287134961-24qidem5pd6qhtkq43b3a9cfcp87c49p.apps.googleusercontent.com` | `mobile/src/lib/googleAuth.ts` |
| AdMob app ID | `ca-app-pub-3177287525203129~3298255365` | `mobile/app.json` |
| AdMob interstitial | `ca-app-pub-3177287525203129/7425202639` | `mobile/src/lib/ads.ts` |
| AdMob rewarded | `ca-app-pub-3177287525203129/6765465304` | `mobile/src/lib/ads.ts` |
| Supabase project | `pmtgeydtqypwrypshhsx` | `mobile/src/lib/supabase.ts` |

### Secrets — where they live, not what they are

| Secret | Location |
|---|---|
| Upload keystore + password | with the developer only; **never commit** |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD` | GitHub repo secrets on `gmck` |
| Gemini / AI keys | Supabase edge-function secrets |

---

## 4. Supabase

Nothing new was needed. The native app calls the same RPCs and edge functions
the web app already uses, all present in `supabase/migrations`:

`register_open`, `claim_or_merge_profile`, `record_question_done`,
`record_question_undone`, `record_questions_done`, `get_weekly_leaderboard`,
`get_year_leaderboard`

Edge functions used: `ask-gemini`, `generate-handwritten-notes`.

**One setting to confirm:** Authentication → Providers → **Anonymous must be
ON**. The app signs in anonymously so progress sync, streaks and the
leaderboard work before a user signs in with Google. The web app relies on it
too.

Google provider must carry the Web Client ID above.

---

## 5. Repository state

- **`gmck`** (private) is the migration target and is current. Full history
  preserved (~1817 commits), with the leaked-secret file purged.
- **`mbbsqbank-questor-ee7eadb9`** is the original. Work lives on branch
  `claude/android-react-native-app-o54cjj`. Still contains the leaked key in
  history.

Because history was rewritten for `gmck`, its commit SHAs differ from the
original. File contents are identical.

To re-sync `gmck` after further work on the original:

```sh
git clone --no-local <original> /tmp/mig && cd /tmp/mig
git checkout claude/android-react-native-app-o54cjj
git filter-repo --force --invert-paths --path src/components/AIChatWindow.tsx
git remote add gmck https://github.com/Sabharivarshan111/gmck.git
git push --force gmck HEAD:refs/heads/main
```

---

## 6. Building

Two paths, both documented:

- `mobile/README.md` — desktop path (`npm run android`, Fast Refresh)
- `mobile/BUILD-FROM-PHONE.md` — **phone-only** path via GitHub Actions

`.github/workflows/android-release.yml` is a manually-triggered workflow that
typechecks, lints and produces a signed AAB + APK as artifacts. It reads the
keystore from a base64 repo secret, writes it outside the workspace, and
deletes it afterwards. It fails loudly if the secret is missing rather than
silently emitting a debug-signed build.

**The workflow has never completed a real run** — it cannot until the upload
key reset lands. Expect to debug it on first use.

---

## 7. What has and has not been verified

**Verified mechanically:** TypeScript clean, ESLint 0 errors, Android release
bundle builds, live ad unit IDs present in the release bundle with the dev
branch dead-code eliminated, shared blocklist strings present in the bundle,
question counts match the web app (2nd year = 1219, Forensic Medicine topic
counts identical).

**Verified visually:** every screen, through the react-native-web preview
harness at phone viewport. This renders the real components but is *not* a
device.

**NOT verified — needs a real device:**

- Google Sign-In handshake (no Play Services in the sandbox)
- Actual ad delivery
- Notes generation end-to-end (sandbox blocks Supabase)
- Leaderboard with real rows (only the error path was exercised)
- Font weight rendering on real Android

Do not describe any of the above as working until someone runs it on a phone.

---

## 8. Suggested next steps

1. Submit the upload-key-reset `.pem`; revoke the OpenAI key. (blocking)
2. Add the three GitHub secrets on `gmck`; run the workflow; fix what breaks.
3. Sideload the APK and walk the checklist in `BUILD-FROM-PHONE.md` §Step 4.
4. Upload to **internal testing** — the first build signed by Google, and so
   the first real test of sign-in against the deployment certificate.
5. Then, in rough value order: Razorpay, the Calendar/saved-notes tabs,
   local notifications.
