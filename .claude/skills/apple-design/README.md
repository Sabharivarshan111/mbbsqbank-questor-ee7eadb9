# The design skills, and how they apply to Orbit MBBS

## What is installed here

Vendored from **https://github.com/emilkowalski/skills** (`skills/`), unmodified:

| Skill | What it is |
|---|---|
| `apple-design/SKILL.md` | Apple's interface + fluid-motion principles. The *why*. |
| `animate/SKILL.md` + `RECIPES.md` | Building an animation: the decision order, and ready-made recipes. |
| `review-animations/SKILL.md` + `STANDARDS.md` | The enforcement bar. **`STANDARDS.md` holds the exact curves, durations and spring configs — cite it instead of approximating.** |
| `improve-animations/SKILL.md` | Auditing a whole codebase's motion. |
| `find-animation-opportunities/SKILL.md` | Finding what *should* animate, and rejecting what shouldn't. |
| `animation-vocabulary/SKILL.md` | Reverse-lookup glossary: description → the correct term. |
| `emil-design-eng/SKILL.md` | The broader design-engineering philosophy. |

Deliberately **not** vendored: `ask-sonner`, `pick-ui-library`, `prototype` — all
three are about picking and wiring web component libraries, which has no bearing
on a React Native app.

`apple-design/SKILL.md` here is byte-identical to upstream. It has no companion
files upstream; `RECIPES.md` and `STANDARDS.md` belong to `animate` and
`review-animations` respectively.

## What this is and is not

This is **design discipline** — spring physics, interruptibility, velocity
handoff, typographic tracking, reduced-motion behaviour. It is **not** Apple's
visual identity. Orbit does not use Apple's fonts, icons, artwork, SF Symbols,
system materials, or trademarks, and does not present itself as
Apple-affiliated. The app's own look — pure-black surfaces, white primary, the
cyan/emerald/fuchsia subject gradients — comes from the published Orbit design
and stays.

## Web → React Native mapping

Every skill above is written for the **web** (CSS, Pointer Events,
`backdrop-filter`, Motion/Framer Motion). None of those APIs exist here, so the
rules had to be re-implemented rather than copy-pasted.

| Skill says (web) | Orbit does (React Native) | Lives in |
|---|---|---|
| Motion/Framer Motion springs | `Animated.spring` with `useNativeDriver` | `src/theme/motion.ts` |
| `bounce` + `duration` | Apple's damping-ratio + response, converted to RN's `stiffness`/`damping`/`mass` | `springConfig()` |
| `cubic-bezier(0.23, 1, 0.32, 1)` etc. | `Easing.bezier(...)`, named once | `EASE` |
| Pointer Events + `setPointerCapture` | `PanResponder` (RN captures the touch for the responder automatically) | `src/components/Sheet.tsx` |
| `:active { transform: scale() }` | `Pressable` `onPressIn` → scale spring on the native thread | `src/components/Touchable.tsx` |
| CSS transitions (interruptible) vs `@keyframes` (not) | `Animated.spring`/`timing` on a retained `Animated.Value` — always retargets from the current value, so the keyframe trap does not exist here | everywhere |
| `@starting-style` | mount-time `Animated.Value` + a `firstRun` ref | `Dialog`, `Sheet` |
| `prefers-reduced-motion` | `AccessibilityInfo.isReduceMotionEnabled()` + its change event | `useReducedMotion()` |
| `@media (hover: hover)` gating | not applicable — Android is touch-only, there is no hover state to gate | — |
| `will-change` / compositing | `useNativeDriver: true` (the equivalent guarantee: the animation leaves the JS thread) | `springConfig()` |
| `backdrop-filter: blur()` | **not available** without a native module. Depth is carried by layered opacity, a bright hairline top edge, and elevation instead. | `BottomNav`, `Sheet` |
| `letter-spacing` in `em` | RN's `letterSpacing` is in **points**, so tracking is computed per size | `src/theme/typography.ts` |
| `rem`-based Dynamic Type | `maxFontSizeMultiplier` + a type ramp | `typography.ts`, `components/Text.tsx` |

## The rules that bind, and where they are honoured

From `review-animations/STANDARDS.md` and `animate/SKILL.md`'s "Never Ship":

1. **Never `scale(0)`.** The checkbox fill grows from `0.6`, the tab dot from
   `0.4`. Nothing in the app scales from zero.
2. **Never `ease-in`; built-in easings are too weak.** Every `Animated.timing`
   in the app names a curve from `EASE`. RN's default is `Easing.inOut(ease)` —
   an ease-in-out — so leaving `easing` off is itself the violation.
3. **`transform` and `opacity` only.** Progress bars use `scaleX` +
   `transformOrigin: 'left'`, never an animated `width`. Width is a layout
   property; animating it costs layout + paint + composite every frame, on the
   JS thread, per bar.
4. **UI motion stays under 300ms.** `DURATION.slow` is capped at 280 for that
   reason. Press feedback sits at 160ms, inside the 100–160ms budget.
5. **Frequency gates motion.** Press feedback is seen tens of times a day, so it
   is near-imperceptible (`scale 0.97`, 160ms) or nothing. The home carousel's
   6-second auto-advance is a ~0.17 Hz loop and is switched off entirely under
   reduced motion.
6. **Exit the way you entered.** Sheets leave downward; the dialog shrinks back
   toward where it grew from.
7. **Springs for gestures.** The sheet drag carries release velocity into the
   spring and picks its target from the *projected* landing point, not the
   release position.
8. **Reduced motion is gentler, not zero.** Scale feedback becomes opacity
   feedback; slides become cross-fades; overshoot is always dropped.
9. **Modals are exempt from origin-anchoring.** `Dialog` stays centred, which is
   what the standards prescribe.

## Deliberate departures

- **No `backdrop-filter` equivalent.** Real translucency on Android needs
  `@react-native-community/blur` or similar. Adding a native module for a visual
  effect was judged the wrong trade on low-end devices (`apple-design` §16
  Purpose: spend the budget where it pays off). Hierarchy is carried by material
  *weight* — background, card, elevated card — plus a bright hairline top edge
  on floating chrome.
- **Haptics only where a moment earns one**, and on the core `Vibration` API
  rather than `react-native-haptic-feedback`. Android's HapticFeedbackConstants
  give a nicer tick, but that is another native module to compile, shim and
  carry on every cheap phone for a refinement most users cannot name.
  `src/lib/haptics.ts` is the only place that vibrates, and there are exactly
  two callers, each clearing the §13 Utility bar of *commit* or *completion*:
  switching theme (10ms tick) and a focus session ending (two short pulses,
  paired with the dial's flourish so both land together — Harmony). Navigation,
  scrolling and ordinary taps get nothing.

  Two things worth knowing. The `VIBRATE` permission was missing from the
  manifest until this was wired up, so the timer's completion buzz had never
  actually fired on a device despite the code being there since it was written.
  And `Vibration.vibrate` ignores Android's system-wide touch-feedback setting —
  reading that needs the native module this avoids — so the mitigation is
  restraint rather than a check. `haptics.ts` is the one place to gate if a
  user-facing switch is ever wanted.
- **No motion blur** (§11) — not expressible in RN's animation system without a
  shader.
- **No stagger on list entrances.** The long lists are `FlatList`s whose rows
  appear on scroll; a stagger there would fire constantly, which is exactly the
  frequency tier that says "no animation".
- **One JS-driven animation.** `ProgressRing`'s arc animates SVG stroke
  geometry, which is not a transform, so react-native-svg has to be driven from
  JS. It is a single value on a screen that is not scrolling while it runs.
  Everything a finger touches stays on the native thread.

These are recorded so nobody "fixes" them by accident, and so the cost of
picking them up later is visible.
