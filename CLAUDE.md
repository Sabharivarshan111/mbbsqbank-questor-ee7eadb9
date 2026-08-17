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

7. **Progress bars use `scaleX` + `transformOrigin: 'left'`, never an animated
   `width`.** Width is a layout property: animating it forces layout, paint and
   composite every frame, on the JS thread, for every bar on screen. `scaleX`
   is a transform and composites on the GPU. This looks like an over-complicated
   way to draw a bar; it is the difference between a smooth one and a stuttering
   one on a cheap phone.

8. **Nothing scales from 0.** The checkbox fill starts at `0.6`, the tab dot at
   `0.4`. A `scale(0)` entrance reads as materialising out of nowhere.

9. **Every `Animated.timing` names an `easing` from `EASE`.** React Native's
   default is `Easing.inOut(Easing.ease)` — an ease-in-out that starts slow,
   delaying the exact moment the user is watching. Omitting `easing` is the bug,
   not the default.

## The question bank is shared, not copied

`src/data/` (~750 KB of pure TypeScript) is consumed by the native app through
a `@data` alias; `src/lib/profanity.ts` through `@shared`. Wired in
`mobile/metro.config.js`, `mobile/babel.config.js`, `mobile/tsconfig.json` and
`mobile/preview/vite.config.ts` — all four must agree.

Never duplicate these files into `mobile/`. A second copy will drift.

## Motion goes through `src/theme/motion.ts`

Do not hand-roll an animation. The house springs, easing curves, duration scale,
momentum projection and rubber-banding all live in `mobile/src/theme/motion.ts`,
and the primitives that use them are:

| Use | Component |
|---|---|
| Anything tappable | `components/Touchable.tsx` — press-down spring, hit slop, required a11y label |
| Bottom sheets | `components/Sheet.tsx` — drag-to-dismiss with velocity handoff |
| Either/or decisions | `components/Dialog.tsx` |
| Back navigation | `components/BackButton.tsx` |
| Long lists | spread `components/listTuning.ts` onto the `FlatList` |

The rules those files obey come from the vendored skills in
`.claude/skills/` — `apple-design` for the principles, `animate` and
`review-animations/STANDARDS.md` for the exact curves, durations and the
"never ship" list. **`.claude/skills/apple-design/README.md` is the index**: it
maps each web technique to its React Native equivalent and records which ones
were deliberately not taken (no backdrop blur, no haptics, no stagger) so nobody
"fixes" them by accident.

Question rows subscribe to **one question** (`useQuestionDone`), never to the
store's global version. Using `useProgressVersion` in anything rendered per row
makes one tick re-render every mounted row; `npm run check:fanout` fails if that
regresses.

Reduced motion is not optional. `useReducedMotion()` is wired into every
primitive; new motion must handle it in the same commit, not as a follow-up.

## Design tokens

`src/theme/tokens.ts` holds the spacing and radius scales; `typeScale` in
`src/theme/typography.ts` holds the type ramp. Use them instead of raw numbers.
A size written as a bare `fontSize` ships without the tracking and leading that
belong to it, which is the whole reason the ramp exists.

`src/theme/textScale.tsx` is the in-app text size. It multiplies the ramp and
is applied centrally in `components/Text.tsx`, which takes a **zero-cost fast
path when the size is Default** — do not move that work anywhere it would run
per row.

## Accessibility is part of the component contract

`Touchable` **requires** a `label`. That is deliberate — an unlabelled control
is unusable with TalkBack, and making it a required prop is the only way that
stays true as screens get added. Give lists one spoken sentence per row rather
than four fragments, and keep every target at 44dp (use `hitSlop`, not padding
that changes the design).

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
npm run check:fanout             # per-question subscriptions still isolated
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/b.js   # must succeed
```

Screenshots:

```sh
cd mobile && node preview/shoot.mjs [outDir]   # writes one PNG per screen
```

There is no emulator in most sandboxes, so a green bundle is the strongest
available signal. Do not claim device behaviour was verified when it was not —
and note the preview harness is react-native-web, so it checks layout, not
native rendering, gestures or animation timing.
