# ORBIT MBBS QBANK — native Android app

A **React Native** app. Not a WebView, not Capacitor: the screens are real
Android views driven by Hermes, and the release build is an ordinary APK/AAB.

The web app in the repo root stays exactly as it is — this project lives
alongside it and **shares the question bank** rather than copying it.

---

## What's here

| Path | What it is |
|---|---|
| `App.tsx`, `index.js` | App entry — providers, navigation container |
| `src/screens/` | Home, Notes, Timer, Ask AI, My Progress, question-bank browse |
| `src/components/` | Bottom nav (raised centre timer), question row, gradients, primitives |
| `src/lib/` | Question bank access, progress store, Supabase client, text helpers |
| `src/theme/` | Palette ported from `src/index.css` (pure-black dark, white primary) |
| `android/` | The native Android project — this is what becomes your APK |
| `preview/` | **Dev-only** browser preview for design review. Never bundled. |

### The question bank is shared, not duplicated

`src/data/` in the repo root (~750 KB of pure TypeScript, no DOM
dependencies) is consumed directly through a `@data` alias, wired up in two
places:

- `metro.config.js` — adds it to `watchFolders` so Metro may resolve outside
  the project root
- `babel.config.js` — maps `@data/*` to `../src/data/*`

Add a question to the web app and the native app has it on the next reload.
There is no second copy to keep in sync.

---

## Step 1 — Install the toolchain (one time)

You need **Node 22+**, **JDK 17+**, and the **Android SDK**.

1. **Node**: https://nodejs.org (or `nvm install 22`)
2. **Java**: install JDK 17 — `sudo apt install openjdk-17-jdk`, `brew install openjdk@17`, or Temurin on Windows
3. **Android Studio**: https://developer.android.com/studio
   During setup, tick **Android SDK**, **Android SDK Platform**, and
   **Android Virtual Device**.
4. In Android Studio → *Settings → Languages & Frameworks → Android SDK*,
   install **Android 15 (API 35)** and, under *SDK Tools*, **Android SDK
   Build-Tools** and **Android SDK Platform-Tools**.
5. Point your shell at the SDK. Add to `~/.bashrc` / `~/.zshrc`:

   ```sh
   export ANDROID_HOME=$HOME/Android/Sdk        # macOS: $HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/emulator
   ```

   On Windows set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` via
   *System → Environment Variables*.

6. Verify: `adb --version` and `java -version` both print something.

## Step 2 — Install project dependencies

```sh
cd mobile
npm install
```

## Step 3 — Run it on a device

**On your phone** (fastest, and what you actually want to see):

1. On the phone: *Settings → About phone → tap "Build number" 7 times* to
   unlock Developer options.
2. *Settings → Developer options → USB debugging* → on.
3. Plug the phone in, accept the "Allow USB debugging" prompt.
4. Confirm the computer sees it:

   ```sh
   adb devices        # your phone should be listed as "device"
   ```

5. Build and launch:

   ```sh
   npm run android
   ```

The first build downloads Gradle and the Android dependencies — expect
5–15 minutes. Later builds take seconds.

**On an emulator instead**: Android Studio → *Device Manager* → *Create
device* → pick a Pixel, download a system image, start it, then
`npm run android`.

### Day-to-day

`npm run android` starts Metro automatically. If you need it separately:

```sh
npm start            # Metro bundler
npm start -- --reset-cache   # after changing metro/babel config
```

Shake the device (or `adb shell input keyevent 82`) for the dev menu.
Fast Refresh applies edits as you save.

## Step 4 — Check it before you build

```sh
npm run typecheck    # TypeScript
npm run lint         # ESLint
```

## Step 5 — Sign the release build

This app is **already published**, so it must be signed with the existing
upload key — `my-upload-key.jks`, alias `upload`. A different key produces an
upload Play will reject.

Point the build at it through the environment (never commit these):

```sh
export KEYSTORE_PATH=/absolute/path/to/my-upload-key.jks
export STORE_PASSWORD=…
export KEY_PASSWORD=…
```

On Windows PowerShell:

```powershell
$env:KEYSTORE_PATH="C:\path\to\my-upload-key.jks"
$env:STORE_PASSWORD="…"
$env:KEY_PASSWORD="…"
```

Without `KEYSTORE_PATH` the release build falls back to the debug key so
`assembleRelease` still compiles — that output is for local testing only and
**cannot be published**.

## Step 6 — Build the artifact

**APK** — for sideloading and sharing directly:

```sh
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Install it on a plugged-in phone with `adb install -r <path to apk>`.

**AAB** — the format Google Play requires:

```sh
cd android
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

Upload that `.aab` in the Play Console.

On Windows use `gradlew.bat` instead of `./gradlew`.

### Published app identity — do not change

These match the live Play listing. Changing `applicationId` would create a
**second listing** rather than updating the existing one.

| | Value |
|---|---|
| App name | Orbit MBBS |
| `applicationId` / `namespace` | `com.aistudio.mbbsqbank.aycxvd` |
| Deep-link scheme | `com.aistudio.mbbsqbank.aycxvd` |
| `minSdkVersion` | 24 |
| `targetSdkVersion` | 36 |

### Version bumps

`versionCode 13` / `versionName "0.0.0.13"` is the version already on Play, so
this repo carries **14 / "0.0.0.14"** — Play rejects any upload whose
`versionCode` is not higher than the last published one. Raise both in
`android/app/build.gradle` before every subsequent upload.

### Google Sign-In

Configured in `src/lib/googleAuth.ts` with the existing Web Client ID and
`offlineAccess: true`, exchanged for a Supabase session via
`signInWithIdToken`. Two things live outside this repo and must be in place or
sign-in fails at runtime:

1. The same Web Client ID must be set in **Supabase → Auth → Providers →
   Google**, which validates the ID token's audience.
2. Google Cloud needs an **Android OAuth client** whose SHA-1 matches the
   signing certificate. You need one per certificate — the upload key for
   local/internal builds, and the **Play App Signing** certificate for
   production (Play Console → Setup → App signing). Miss the Play one and
   sign-in works in testing but fails for real users.

---

## Design preview (optional, dev-only)

There is no Android emulator on every machine, so `preview/` renders the same
screen components in a desktop browser through `react-native-web`:

```sh
npm run preview      # http://localhost:5173
```

Query params pick the screen: `?screen=timer`,
`?screen=home&node=pharmacology,paper-1&title=Paper%201`.

This is a design tool only. It is not imported by `index.js`, Metro never sees
it, and nothing from it reaches the APK. Delete the folder and the app builds
identically.

---

## What is ported, and what is not

**Working:**

- Home — hero carousel, quick actions, subject cards with live progress, streak
  and focus-time stats
- Question bank — year → subject → paper → topic → questions, at any nesting
  depth, with essay / short-note tabs
- Question rows — tick to complete, importance stars, page references
- Full-text search across all 5,500+ questions
- Ask AI — talks to the same `ask-gemini` Supabase edge function as the web app
- Pomodoro timer — wall-clock based, so it keeps time while backgrounded
- My Progress — profile header, year ring, streak and level, rewards, weak-topic
  heatmap, per-subject breakdown, theme switch, cloud sync
- Profile — name and year editor, doubling as first-run onboarding; the name
  goes through the web app's blocklist (shared, not copied) and the stored
  shape is byte-compatible with the web app's `orbit-profile-v1`, so one
  profile covers both installs
- Streak — via the same `register_open` RPC the web app calls on launch
- Leaderboard — weekly and lifetime, read through the `get_weekly_leaderboard`
  and `get_year_leaderboard` security-definer RPCs, so profile rows stay
  private
- Progress storage — same `question-*` keys as the web app, so a signed-in
  account sees the same completion state on both

Anything touching Supabase degrades gracefully: the profile saves locally first
and an unreachable backend is logged, not surfaced as a failure.

- Handwritten notes — year → subject → topic, then batched generation against
  the `generate-handwritten-notes` edge function, with the merged page cached
  back so later opens are a single call. Includes the AI refine box and
  regenerate, and renders all ten section shapes the function emits.

**Still to port** (each is a self-contained addition):

- Google sign-in — add `@react-native-google-signin/google-signin` and call
  `supabase.auth.signInWithIdToken`; needs an Android OAuth client whose SHA-1
  matches your signing key. Until then the app uses anonymous Supabase
  sessions, which is enough for progress sync, streaks and the leaderboard.
- Calendar and saved-notes tabs on My Progress (placeholders today)
- AdMob — `react-native-google-mobile-ads`
- Razorpay payments — `react-native-razorpay`
- Handwritten notes generation, quiz/revision sessions, leaderboard
- Local notifications — `@notifee/react-native`

Progress and the question bank are already shared, so these can be added one at
a time without disturbing what works.
