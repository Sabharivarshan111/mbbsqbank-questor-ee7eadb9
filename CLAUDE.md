# Orbit MBBS — working notes

Read `HANDOFF.md` first for current status and what is outstanding. This file
is the short version: the rules that are easy to break by accident.

## Two apps, one repo

| Path | What |
|---|---|
| `src/`, `index.html`, `vite.config.ts` | the original Vite/React **web** app |
| `mobile/` | the **native React Native Android** app |
| `supabase/` | edge functions and migrations, shared by both |

They share one Supabase project and one question bank. The web app is still
live; do not refactor it while working on the native app.

## Things that look like bugs but are deliberate

Do not "fix" these without reading the reasoning:

1. **`applicationId` is `com.aistudio.mbbsqbank.aycxvd`.** It matches the
   published Play listing. Changing it publishes a *second app* instead of an
   update.

2. **Debug builds use Google's test ad units** (`src/lib/ads.ts`). Serving live
   ads to yourself during development is an AdMob policy violation that can get
   the account suspended. The `__DEV__` ternary is intentional.

3. **`tabBar={props => <BottomNav {...props} />}` in `RootNavigator.tsx`** must
   stay an element, not a bare component reference. React Navigation invokes
   `tabBar` directly, so passing the component calls it outside React and its
   hooks throw "Invalid hook call". There is an eslint-disable on it.

4. **`manifestPlaceholders["appAuthRedirectScheme"] = …`** uses an indexed put,
   not `manifestPlaceholders = [...]`. The React Native Gradle plugin writes
   `usesCleartextTraffic` into the same map; a whole-map assignment can drop it
   and break manifest merging.

5. **Font is pinned to Roboto** (`src/theme/typography.ts`, applied via
   `src/components/Text.tsx`). React Native otherwise follows the *system* font,
   and OEM skins replace it — MIUI ships MiSans, One UI ships SamsungOne — which
   would silently re-typeset the app on those phones.

6. **`versionCode` must increase on every Play upload.** 13 is already live; the
   repo carries 14.

## The question bank is shared, not copied

`src/data/` (~750 KB of pure TypeScript) is consumed by the native app through
a `@data` alias; `src/lib/profanity.ts` through `@shared`. Wired in
`mobile/metro.config.js`, `mobile/babel.config.js`, `mobile/tsconfig.json` and
`mobile/preview/vite.config.ts` — all four must agree.

Never duplicate these files into `mobile/`. A second copy will drift.

## Storage keys are shared with the web app

The native app deliberately reuses the web app's keys so one user with both
installed sees one state, not two:

- `orbit-profile-v1` — `{ display_name, year }` with short year codes
  (`first`/`second`/`third`/`final`), **not** the internal `YearKey` form
- `question-<first 50 chars, spaces→dashes>` — per-question completion
- `orbit:daily-ad:{progress,theme,questions}` — daily ad caps

Changing any of these shapes breaks cross-install continuity.

## `mobile/preview/` is a dev-only tool

It renders the RN screens in a desktop browser via react-native-web so screens
can be reviewed without an emulator. It is **not** imported by `index.js`,
Metro never sees it, and nothing from it reaches the APK.

It has its own shims for native modules (Google Sign-In, AdMob, AsyncStorage).
When you add a native dependency, add a shim or the preview build breaks. When
you add a provider to `App.tsx`, add it to `preview/main.tsx` too — several
bugs have come from the two drifting.

## Verify before claiming something works

```sh
cd mobile
npx tsc --noEmit                 # must be clean
npx eslint .                     # 0 errors (warnings are inline-style noise)
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/b.js   # must succeed
```

There is no emulator in most sandboxes, so a green bundle is the strongest
available signal. Do not claim device behaviour was verified when it was not.
