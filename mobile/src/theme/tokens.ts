/**
 * Spacing and radius scales.
 *
 * The screens were written with ad-hoc values — 8, 10, 12, 14, 16, 20, 24, 26
 * all appear as margins, often within the same card. Individually each is
 * defensible; together they are noise, and the eye reads inconsistent rhythm
 * as carelessness even when it cannot name what is wrong (apple-design §16
 * Craft: "nothing is random — every spacing value is a deliberate choice you
 * can defend").
 *
 * A 4dp base, skipping the steps nobody needs. Use these instead of numbers.
 */
export const space = {
  /** Between an icon and its label. */
  xs: 4,
  /** Inside a chip; between tightly-related lines. */
  sm: 8,
  /** The default gap between siblings in a group. */
  md: 12,
  /** Card padding; gap between cards. */
  lg: 16,
  /** Between a heading and its content. */
  xl: 20,
  /** Between major sections of a screen. */
  xxl: 28,
} as const;

/**
 * Radii. Bigger surfaces take bigger radii — a 16dp corner on a small chip
 * reads as a blob, and a 8dp corner on a full-width card reads as a box.
 */
export const radius = {
  /** Chips, badges, small controls. */
  sm: 8,
  /** Buttons, inputs. */
  md: 12,
  /** Cards, list rows. */
  lg: 16,
  /** Sheets and hero surfaces. */
  xl: 24,
  /** Fully round. */
  pill: 999,
} as const;

/**
 * The minimum touch target. Below this, a control is unreliable for anyone
 * with imprecise aim — which at some point is everyone, on a bus.
 */
export const TOUCH_MIN = 44;
