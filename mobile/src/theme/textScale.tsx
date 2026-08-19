import { createContext, useContext } from 'react';

/**
 * In-app text size.
 *
 * The header has always had a "FONT SIZE" control. It was a plain View — it
 * looked pressable and did nothing, which is worse than not having it: a
 * control that lies about being a control costs trust every time someone taps
 * it (apple-design §16 Craft, and §2 Agency — offer real choices).
 *
 * Android's own font-size setting already scales the app, but it is buried in
 * system settings and it changes every app at once. Someone reading pathology
 * questions for three hours wants this app bigger, not their whole phone. So
 * the control is now real.
 *
 * It is a **continuous multiplier**, not three named steps. Reading comfort is
 * not a three-valued thing: the size that stops someone squinting is personal
 * and lands wherever it lands. Three chips meant the answer was "one of these
 * is closest", and the one that was closest was usually not right.
 *
 * The ceiling is what the layouts can actually take, found by rendering the
 * screens at 1.15, 1.25 and 1.35 rather than guessed. What decides it is the
 * bottom bar: "My Progress" is the longest label in the app that has to fit
 * inside a fifth of the screen width, and the selection pill has to fit around
 * it. At 1.15 it just does; by 1.25 the label is wider than the pill, and by
 * 1.35 it wraps to two lines and the bar breaks outright.
 *
 * The floor goes below 100% because smaller is a real preference, not a
 * degradation: someone working through a subject wants more rows on screen,
 * and nothing clips on the way down. It stops at 90% because the smallest
 * thing in the ramp is an 11pt overline, and 10pt is as small as a label
 * should get before the icon beside it is doing all the work.
 */
export type TextSize = number;

export const TEXT_SIZE_MIN = 0.9;
export const TEXT_SIZE_MAX = 1.15;
export const TEXT_SIZE_DEFAULT = 1;
/**
 * One percent. Fine enough that a drag feels continuous, coarse enough that
 * dragging the full range costs a bounded number of re-renders rather than
 * one per frame — every Text in the app reads this.
 */
export const TEXT_SIZE_STEP = 0.01;

/** Rounds to the step and holds the value inside the supported range. */
export function clampTextSize(value: number): number {
  const stepped = Math.round(value * 100) / 100;
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, stepped));
}

/**
 * What the three-preset version wrote. Someone updating the app has one of
 * these stored, and dropping them would silently reset their text size to
 * Default — so they are read as the multipliers they used to mean.
 */
const LEGACY_SIZES: Record<string, number> = {
  default: 1,
  large: 1.08,
  larger: 1.15,
};

/** Reads whatever is in storage, old shape or new, or null if it is neither. */
export function parseTextSize(stored: string | null): number | null {
  if (!stored) {
    return null;
  }
  const legacy = LEGACY_SIZES[stored];
  if (legacy !== undefined) {
    return legacy;
  }
  const value = Number(stored);
  return Number.isFinite(value) ? clampTextSize(value) : null;
}

/** "108%" — the way the size is spoken and shown. */
export function formatTextSize(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Read by every Text in the app, so it is its own context rather than part of
 * the theme — a theme change should not have to walk every text node, and a
 * text-size change should not invalidate colours.
 */
export const TextScaleContext = createContext<number>(TEXT_SIZE_DEFAULT);

export function useTextScale(): number {
  return useContext(TextScaleContext);
}
