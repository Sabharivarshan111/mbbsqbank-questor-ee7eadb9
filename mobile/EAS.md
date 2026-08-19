# Building with EAS

The Expo project is `2f7f034c-2726-411b-9cd3-ae2398abf131`, wired into
`app.json` under `expo.extra.eas.projectId`. `eas.json` holds the profiles.

EAS Build works fine with this app even though it is **bare React Native with
no Expo SDK** — it compiles the `android/` project as it stands. Expo Go still
cannot run it, and that has not changed: Expo Go contains a fixed set of native
modules, and this app needs Google Sign-In and AdMob, which are not among them.

Both commands have to be run **by you, on your own machine**, not from a Claude
session:

```sh
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init --id 2f7f034c-2726-411b-9cd3-ae2398abf131
npx eas-cli@latest build --profile production
```

`init` is already effectively done — the project id is committed in
`app.json` — but running it is harmless and will confirm the link.

## Two things that will bite, in order of how expensive they are

### 1. The signing key decides whether Play will accept the result

On the first Android build, EAS offers to **generate a new keystore**. Say yes
without thinking and you get an AAB signed with a brand-new upload key, and
Google Play will reject it as an update to `com.aistudio.mbbsqbank.aycxvd`:
Play matches uploads against the upload certificate it already has on file.

There is an upload-key reset already in flight for this app. That makes the
order matter:

- **If the reset has completed** with a key you hold, give EAS *that* keystore
  (`eas credentials` → Android → upload a keystore). A generated one is wrong.
- **If the reset is still pending**, let EAS generate the keystore, then
  download its certificate (`eas credentials` → Android → download) and submit
  *that* certificate to Google as the new upload key. Do not submit one
  certificate and then let EAS make a different one — the reset takes days and
  only applies to the key you sent.

Either way, decide before the build, not after.

### 2. Any EAS build serves live ads. Do not install one to test with

`src/lib/ads.ts` picks Google's test ad units when `__DEV__` is true. Every EAS
profile here is a release build, so `__DEV__` is false and the **live** units
are used. Impressions or clicks on your own live ads are an AdMob policy
violation that can get the account suspended.

So:

- **To test on your phone**, use the debug APK from GitHub Actions ("Android
  debug APK" → download `orbit-debug-apk`). It is built with `--dev true`
  precisely so the test ad units stay in. That is the only build meant to be
  installed by us.
- **To ship**, use `--profile production` and upload the AAB to Play. Do not
  sideload it.

The `preview` profile builds a release **APK** rather than an app bundle. It is
there for distributing to other testers through EAS, and it carries the same
live-ads warning — it is not a substitute for the debug APK.

## versionCode

`autoIncrement` is off in both profiles on purpose. `android/app/build.gradle`
is the single source of truth for `versionCode`, 13 is already live on Play and
the repo carries 14. EAS's auto-increment counts from its own remote state,
which has never seen those numbers and would happily produce a lower one — and
a versionCode that does not increase is rejected at upload.
