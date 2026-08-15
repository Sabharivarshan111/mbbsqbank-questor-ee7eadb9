import { Platform, type TextStyle } from 'react-native';

/**
 * The app is typeset in Roboto.
 *
 * The web build never declared a font, so it inherited Tailwind's stack, which
 * names Roboto and resolves to it inside the Android WebView. React Native
 * instead defaults to whatever the *system* font is — and OEM skins replace
 * that (MIUI ships MiSans, One UI ships SamsungOne), which would silently
 * change the app's typography on those phones. Naming Roboto explicitly keeps
 * every device on the same face as the original app; Roboto is present in
 * /system/fonts on all Android builds, including the skinned ones.
 */
export const FONT_FAMILY = Platform.select({
  android: 'Roboto',
  default: undefined,
});

/**
 * Size-specific tracking.
 *
 * A single letterSpacing value is wrong somewhere (SKILL §15): as type grows,
 * the same gap reads as *too loose*, so display sizes want negative tracking;
 * small type needs a little positive tracking to stay legible. Apple ships a
 * tracking table per size, and this is the same idea fitted to Roboto.
 *
 * Note React Native's letterSpacing is in points, not em — so this has to be
 * computed from the size rather than written once as `-0.02em`.
 */
export function tracking(fontSize: number): number {
  if (fontSize >= 32) {
    return fontSize * -0.022;
  }
  if (fontSize >= 24) {
    return fontSize * -0.017;
  }
  if (fontSize >= 20) {
    return fontSize * -0.012;
  }
  if (fontSize >= 17) {
    return fontSize * -0.006;
  }
  if (fontSize >= 15) {
    return 0;
  }
  if (fontSize >= 13) {
    return 0.08;
  }
  return 0.16;
}

/**
 * Leading tracks size inversely (SKILL §15): tight on headings, comfortable on
 * body copy. Dense list rows sit between the two.
 */
export function leading(fontSize: number): number {
  if (fontSize >= 32) {
    return Math.round(fontSize * 1.08);
  }
  if (fontSize >= 20) {
    return Math.round(fontSize * 1.2);
  }
  if (fontSize >= 15) {
    return Math.round(fontSize * 1.4);
  }
  return Math.round(fontSize * 1.35);
}

/** One ramp step: size, weight and leading chosen together, not size alone. */
function step(fontSize: number, fontWeight: TextStyle['fontWeight']): TextStyle {
  return {
    fontSize,
    fontWeight,
    lineHeight: leading(fontSize),
    letterSpacing: tracking(fontSize),
  };
}

/**
 * The type ramp. Hierarchy is built from weight + size + leading as a set
 * (SKILL §15) so emphasis can come from weight without costing space.
 *
 * Use these instead of loose fontSize/fontWeight pairs, so a size never ships
 * without the tracking and leading that belong to it.
 */
export const typeScale = {
  /** Hero numerals and the timer dial. */
  display: step(44, '800'),
  /** Screen titles. */
  title1: step(28, '800'),
  /** Card and section headings. */
  title2: step(22, '700'),
  title3: step(18, '700'),
  /** Emphasised body, e.g. a question stem. */
  bodyStrong: step(15, '600'),
  body: step(15, '400'),
  callout: step(14, '400'),
  /** Row subtitles, metadata. */
  footnote: step(13, '400'),
  caption: step(12, '400'),
  /** All-caps eyebrow labels; caps need the extra tracking most. */
  overline: { ...step(11, '700'), letterSpacing: 0.9 } as TextStyle,
} as const;

/**
 * Cap on the OS font-size setting.
 *
 * Text still scales with the user's preference — that is the point of
 * respecting Dynamic Type (SKILL §15) — but Android allows up to 2x, which
 * overflows fixed-height rows and the bottom bar. 1.35 keeps large-text users
 * served without the layout breaking, and is applied centrally in
 * components/Text.tsx so no screen has to remember it.
 */
export const MAX_FONT_SCALE = 1.35;
