# Shipping Orbit MBBS without a computer

Short answer: **yes, you can go from this repo to a Play Store update using only
your phone** — but not by compiling on the phone. You trigger a build on
GitHub's servers, download the result, and upload it to Play. Everything below
happens in a mobile browser.

---

## What is and isn't possible on a phone

| Task | On phone? | How |
|---|---|---|
| Edit code | Yes | github.com in browser, or the GitHub mobile app |
| Build a signed AAB/APK | Yes | GitHub Actions (this repo has the workflow) |
| Upload to Play Console | Yes | play.google.com/console in browser |
| Install and test the APK | Yes | Download the artifact and open it |
| Supabase configuration | Yes | supabase.com/dashboard in browser |
| AdMob / Google Cloud setup | Yes | Both consoles work in a mobile browser |
| Run Metro / hot reload while coding | **No, realistically** | Needs a desktop |
| Android emulator | **No** | Needs a desktop |

The one thing you genuinely lose is the fast edit → see-it-instantly loop.
Every change has to go through a ~10-minute cloud build. That is fine for
shipping; it is painful for designing.

---

## Expo Go cannot run this app

Worth stating plainly, because the advice is everywhere online and it does not
apply here. Expo Go is a pre-built container app. Its native code is fixed at
the moment Expo compiles and ships it to the Play Store, and you cannot add to
it from your project. It runs *your JavaScript* inside *their native binary*.

Three separate blockers, any one of which is fatal:

1. **This is bare React Native, not Expo.** There is no `expo` dependency, no
   `app.config`, no `expo-modules-core`. There is nothing for Expo Go to open.
2. **Two native modules Expo Go does not contain** —
   `@react-native-google-signin/google-signin` and
   `react-native-google-mobile-ads`. Sign-in and every ad path would throw at
   the first call. Native code cannot be added to Expo Go from JS.
3. **Version mismatch.** This app is React Native 0.87 / React 19.2.3. Each
   Expo Go release embeds exactly one RN and React version, and the JS
   engine, renderer and native modules have to match the bundle.

What people mean when they say "Expo can run any app" is the **Expo Dev
Client** — a build of the Expo Go shell that includes *your* native modules.
That is real, but producing one is a full native Android build, the same build
this repo already does in Actions. It would add an Expo migration and buy
nothing.

**The equivalent for this project is the debug APK below.** Install it once and
it behaves like Expo Go in the way that matters: it has the dev menu (shake the
phone), the error overlay, and it can connect to Metro for Fast Refresh if you
ever plug into a computer.

### Getting it: Actions → "Android debug APK" → Run workflow

No secrets, no keystore, no computer. Download the artifact, unzip, tap the
`.apk`, allow "install unknown apps" once.

It installs as `com.aistudio.mbbsqbank.aycxvd.debug`, **alongside** your Play
Store copy rather than replacing it, so you can compare the two side by side
and your real progress is never at risk.

Two things to expect:

- **Google sign-in will fail** unless you add an Android OAuth client for
  `...aycxvd.debug` with the debug keystore's SHA-1. Everything else — the
  question bank, progress, timer, Ask AI, notes, the leaderboard via anonymous
  auth — works normally. This is the intended trade for installing alongside
  the real app rather than over it.
- **Ads are Google's test units**, always, and cannot be otherwise in this
  build. That is deliberate: clicking your own live ads is what gets an AdMob
  account suspended.

The APK carries its own JS bundle, so it opens with no computer attached. That
bundle is built in dev mode (`--dev true`), which is what keeps `__DEV__` true
and therefore keeps ads on test units — so it is unminified and carries its
dev-time checks. **Do not judge scrolling smoothness or startup time from it.**
For that, build a release APK; the release bundle is the one that ships.

---

## Before anything else: the signing key

Your app is on Play as `com.aistudio.mbbsqbank.aycxvd`. An update must be
signed with an upload key Google recognises for that listing.

**The current upload key belongs to Google AI Studio, not to you.** The upload
certificate is self-signed with `CN=AI Studio, O=Google`, which means AI Studio
generated the private key and holds it. There is no `.jks` on your machine to
find, so the CI workflow cannot sign with it as things stand.

Play App Signing *is* enabled — the deployment certificate is a Google-issued
`CN=Android, O=Google Inc.` cert, separate from the upload one. That is what
makes this recoverable.

Pick one:

**Option A — Request an upload key reset (recommended)**

Play Console → *Setup → App signing* → **Request upload key reset**. Google
issues a new upload key that you control. Users are unaffected, because Play
re-signs every release with the deployment key regardless. Allow 1–2 business
days. Then generate your own keystore:

```sh
keytool -genkeypair -v -storetype PKCS12 \
  -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Export its certificate — this `.pem`, not the keystore, is what Google's reset
form asks for:

```sh
keytool -export -rfc -keystore upload-keystore.jks \
  -alias upload -file upload_certificate.pem
```

The keystore stays with you. Register the new key's SHA-1 in Google Cloud (see
below) and continue from Step 1.

**Option B — Export the keystore from AI Studio**, if it offers an export.
Then continue from Step 1 as written.

### Certificate fingerprints

Public information — extractable from any published APK — recorded here so the
OAuth setup can be checked without re-downloading the certs.

| Certificate | SHA-1 |
|---|---|
| Upload (AI Studio) | `65:C0:36:DE:45:8B:20:58:33:E4:84:0D:09:79:AD:F1:07:6A:76:05` |
| Deployment (Play App Signing) | `54:F7:27:F7:21:AD:9D:36:3A:42:4C:85:F4:B9:7A:25:A2:E3:FB:D5` |

Google Cloud needs an Android OAuth client for **whichever certificate signed
the build that is running**. The deployment fingerprint is the one real users
hit; miss it and sign-in works in your testing and fails in production. If you
reset the upload key, add the new upload SHA-1 too — the old one stops
mattering once the reset takes effect.

## Step 1 — Turn the keystore into a secret

GitHub secrets hold text, so the `.jks` has to be base64 first.

**Never paste a keystore into a random "online base64 converter" website.** It
is the key to your app's identity. Use one of these instead:

**Option A — GitHub Codespaces (free tier, works in a phone browser)**

1. On github.com, open your repo → green **Code** button → **Codespaces** →
   *Create codespace on main*.
2. Upload `upload-keystore.jks` into the codespace (drag into the file
   explorer, or use the upload button).
3. In the codespace terminal:

   ```sh
   base64 -w0 upload-keystore.jks
   ```

4. Copy the long single-line output.
5. Delete the file from the codespace, then delete the codespace.

**Option B — Termux (offline, nothing leaves the phone)**

1. Install Termux from F-Droid (the Play Store build is outdated).
2. `pkg install coreutils`
3. `termux-setup-storage`, then:

   ```sh
   base64 -w0 /sdcard/Download/upload-keystore.jks
   ```

4. Long-press to copy the output.

## Step 2 — Add the three secrets

On github.com → your repo → **Settings** → *Secrets and variables* →
**Actions** → *New repository secret*. Add exactly these names:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the long base64 string from Step 1 |
| `ANDROID_STORE_PASSWORD` | your keystore password |
| `ANDROID_KEY_PASSWORD` | your key password |

The mobile GitHub *app* does not expose Settings — use a browser
(github.com in Chrome, "Desktop site" if the menu is hard to reach).

## Step 3 — Run the build

1. github.com → your repo → **Actions** tab.
2. Pick **Android release build** in the left sidebar.
3. **Run workflow** → choose the branch → **Run workflow**.
4. Wait ~10–15 minutes for the first run (later runs are faster — npm is
   cached).
5. Open the finished run and scroll to **Artifacts**:
   - `orbit-mbbs-aab` → upload this to Play
   - `orbit-mbbs-apk` → install this on your phone to test

The workflow typechecks and lints before building, so a broken commit fails
fast instead of producing a bad artifact.

## Step 4 — Test the APK on your phone first

1. Download `orbit-mbbs-apk` from the run. It arrives as a `.zip`.
2. Extract it (Files app, or any zip app) → `app-release.apk`.
3. Tap it. Android will ask to allow installing from this source — allow it.
4. Because it is signed with the upload key, this **replaces** an installed
   Play copy of the app. If you want to keep both, uninstall the Play version
   first.

Check on the device, in this order:

- App opens, name reads **Orbit MBBS**
- Onboarding accepts a name, and it survives closing and reopening
- Question counts look right (2nd year should total 1219)
- Ticking a question sticks after a restart
- **Google sign-in completes** — the most likely thing to fail, see
  troubleshooting below
- Ask AI returns an answer
- A rewarded ad plays once when you open My Progress
- The Notes tab generates a page for a topic

## Step 5 — Upload to Play

1. play.google.com/console in your browser → your app.
2. **Testing → Internal testing** for the first upload. Do not go straight to
   production.
3. *Create new release* → upload the `.aab` → add release notes → **Review** →
   **Start rollout to Internal testing**.
4. Add yourself as a tester, install via the opt-in link, and check the same
   list as Step 4 — this build is signed by Google, so it is the first one
   that proves Google sign-in works with the **Play App Signing** certificate.
5. Only once internal testing looks right, promote to Production.

`versionCode` is 14 in this repo. Play rejects re-uploading a code that is
already used, so raise it in `mobile/android/app/build.gradle` for every
upload after this one.

---

## Supabase configuration

Most of this is already correct, because the web app uses the same project.
Everything is at supabase.com/dashboard → project `pmtgeydtqypwrypshhsx`.

**1. Anonymous sign-ins — must be ON**

*Authentication → Providers → Anonymous*. The app signs in anonymously so a
user gets progress sync, streaks and the leaderboard before they ever sign in
with Google. Your web app already relies on this, so it should be on. If it is
off, the profile still saves locally but nothing reaches the cloud.

**2. Google provider**

*Authentication → Providers → Google.* Client ID must be
`358287134961-24qidem5pd6qhtkq43b3a9cfcp87c49p.apps.googleusercontent.com`
— the same value the app sends. You have confirmed this is set.

**3. Nothing else needs changing**

The native app calls the same RPCs and edge functions the web app already
uses, all of which exist in `supabase/migrations`:

- `register_open` — daily streak
- `claim_or_merge_profile` — profile upsert
- `record_question_done` / `record_question_undone` / `record_questions_done`
- `get_weekly_leaderboard` / `get_year_leaderboard`

Edge functions used: `ask-gemini` (Ask AI) and `generate-handwritten-notes`
(Notes). If those are deployed for the web app, the native app uses them
as-is. No new tables, policies or functions.

---

## Play Console "Protected with Play" — leave it alone

The Play Integrity API shows all its verdict fields switched on. That only
controls what a verdict token *would* contain if the app requested one. This
app never calls the Integrity API, so those toggles are inert — no verdicts are
requested and nothing needs decrypting. Do not change the response-encryption
setting; it configures a feature that is not in use.

"Automatic protection" is different and worth keeping on: Google injects
anti-tamper as it serves the app, so unofficial copies are flagged. It applies
to the Play-distributed build only, so it does not affect an APK sideloaded
from a CI artifact, and it does not affect uploads.

If you ever *do* want integrity checks, they need server-side verification in
the Supabase edge functions — it is not something a console switch turns on.

## Google Cloud — the one that bites after release

You have added both SHA-1 fingerprints, which is the right thing. To restate
why it matters:

Sign-in works only if Google Cloud has an **Android OAuth client** whose SHA-1
matches the certificate the running app was signed with. There are two
different certificates:

- your **upload key** — signs the APK you sideload for testing
- the **Play App Signing key** — Google re-signs your app with this before
  serving it to users (Play Console → Setup → App signing)

Miss the second and sign-in works perfectly in your own testing and fails for
every real user. That is why Step 5 says to verify sign-in from the internal
testing track, not just from the sideloaded APK.

---

## If something fails

**Build fails at "Restore the upload keystore"** — the secret is missing or
misnamed. Names are case-sensitive: `ANDROID_KEYSTORE_BASE64`.

**Build fails in gradle with a keystore/password error** — the base64 got
truncated when copying, or the passwords are wrong. Re-copy the base64 as a
single line with no spaces or newlines (`base64 -w0` produces one line).

**Play rejects the upload: "Version code 14 has already been used"** — bump
`versionCode` in `mobile/android/app/build.gradle` and rebuild.

**Play rejects: wrong signing key** — the keystore in the secret is not the
upload key for this listing. See the keystore section at the top.

**Google sign-in fails on device** — almost always a missing SHA-1 for the
certificate in use. Confirm you have Android OAuth clients for both the upload
key and the Play App Signing key.

**Ads never appear** — a brand-new AdMob app ID can take a few hours to start
serving, and rewarded ads are capped to once per bucket per day by design.
Debug builds show Google's test ads; only release builds request live ones.

**App crashes immediately on launch** — usually a missing AdMob app ID.
Confirm `app.json` still contains the `react-native-google-mobile-ads` block.

---

## If you ever get access to a computer

The full loop is much better: `npm install` then `npm run android` with a
phone plugged in gives Fast Refresh, so edits appear in about a second instead
of a 15-minute build. See `README.md` for that path. The cloud workflow keeps
working either way, and is the better way to produce release builds regardless
because it builds from a clean checkout every time.
