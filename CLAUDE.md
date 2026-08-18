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

## `ask-gemini` is told the intent, it does not infer it

`mobile/src/lib/askAi.ts` owns every request to that function, and nothing else
should build one. The function picks its system prompt from **flags in the
request body** — `isMCQRequest` selects the MCQ branch (3000 tokens, temp 0.6,
strict formatting rules); without it you get "You are ACEV, a helpful and
knowledgeable assistant" at 2000 tokens. Sending prose that *describes* wanting
MCQs does nothing; `isMCQsRequest = explicitMCQRequest` and that is its only
source.

Two consequences that look like trivia and are not:

- The `Triple-tapped:` / `Double-tapped:` prefixes are load-bearing markers,
  and `displayText()` strips them before anything reaches a chat bubble.
- The medical-vs-generic system prompt is chosen by **keyword match on the
  prompt** (`index.ts` line 363: 'medical', 'disease', 'pathology', 'symptom',
  'treatment', 'diagnosis'…). "Discuss the aetiology of jaundice" hits none of
  them, so `tripleTapPrompt()` says "MBBS medical exam question" on purpose.
  Reword it and the answer quietly comes from a general-purpose chatbot.

MCQ responses come back as JSON inside markdown fences with a preamble, whatever
the prompt demands. `parseMcqs()` takes the outermost bracket pair and drops any
item without four options or with an out-of-range `correct`; a half-valid quiz
teaches wrong answers, so the fallback is showing the prose instead.
`npm run check:mcq` covers all of that.

## `generate-handwritten-notes` rejects the whole request, not the bad item

Its zod schema is `questions: z.array(z.string().max(1000)).min(1).max(400)`,
and a violation is a **400 for the entire request**. One over-long question
therefore breaks Notes for its whole topic, with no symptom anywhere else in the
app — you have to open the one topic that is too big to see it.

Three questions in the shipped bank are over (Pharmacology → CNS 1463 chars,
Pathology → Heart 1477, General Medicine → Cardiology 1061). They are real
multi-part essay questions with a "Probable Cases" list, not corrupt data, so
`src/lib/notesLimits.ts` clamps on the way out instead.

Clamp from the **head**: the importance stars and PYQ year markers are at the
start of a question string, and the model reads them to fill `pyqYears`.
Trimming the front to fit would empty the year badges instead.
`npm run check:notes-limits` walks all 413 topic groups.

## Cloud progress needs a profile, not just a session

`record_questions_done` opens with `IF _year IS NULL THEN RETURN 0` — it reads
the caller's `profiles.year`, so a push before that row exists returns 0 and
reports **no error**.

Anonymous sign-in happens inside `saveProfile` and nowhere else, so on a fresh
install there is no session at launch and `App.tsx`'s `reconcileProgress()`
legitimately does nothing. Something therefore has to run it *again* once the
profile is saved, or everything ticked before onboarding stays on the device —
it only self-heals on the next launch or the next visit to My Progress, which
is why it went unnoticed. `useProfile.save` does that, gated on the returned
cloud profile because that is the proof both the session and the row exist.

`npm run check:sync` pins the ordering.

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

## A render error must never blank the app

`mobile/src/components/ErrorBoundary.tsx` wraps everything in `App.tsx` —
**outside** the providers, so it still catches when the thing that threw is a
provider. It deliberately uses plain React Native components and literal
colours: a fallback that depends on the code that just failed is not a
fallback. Keep it that way.

## Haptics are two calls, and both are earned

`mobile/src/lib/haptics.ts` is the only thing in the app that vibrates:
switching theme, and a focus session ending. Adding a third caller means
clearing the same bar — a commit or a completion, never navigation or an
ordinary tap. The `VIBRATE` permission in `AndroidManifest.xml` is what makes
any of it work; without it every call is a silent no-op.

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
npm run check:sync               # progress reaches the cloud once a session exists
npm run check:mcq                # MCQ response parsing + the ask-gemini markers
npm run check:notes-limits       # every topic still fits the notes function's schema
npm run check:smoke              # drives the real screens; 12 flows, 0 crashes
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/b.js   # must succeed
```

`check:smoke` selects controls by accessibility label, so a control it cannot
find is one TalkBack cannot announce either. It needs the sandbox's Chromium and
is not wired into CI.

Screenshots:

```sh
cd mobile && node preview/shoot.mjs [outDir]   # writes one PNG per screen
```

There is no emulator in most sandboxes, so a green bundle is the strongest
available signal. Do not claim device behaviour was verified when it was not —
and note the preview harness is react-native-web, so it checks layout, not
native rendering, gestures or animation timing.
