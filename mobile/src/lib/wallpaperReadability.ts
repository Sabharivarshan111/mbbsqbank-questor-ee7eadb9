import { contrast, hexToRgb, luminance, onColor, rgbToHex } from '@/theme/color';

/**
 * Working out what a wallpaper does to readable text, and what to do about it.
 *
 * No imports beyond the colour maths, so `npm run check:readability` can run
 * the whole thing off-device against real values.
 *
 * The problem: text sits over a photograph nobody has seen. The app's own
 * palette guarantees contrast against its background, and a wallpaper throws
 * that guarantee away — the same white heading is perfect over a night sky and
 * invisible over a beach.
 *
 * The insight that makes this solvable rather than a guess: **the scrim is
 * between them**. Content is not drawn on the photo, it is drawn on the photo
 * *blended with the theme's background colour* at the scrim's opacity. So the
 * effective background is a known function of one unknown, and the scrim
 * needed for a given contrast ratio can be solved for instead of eyeballed.
 */

/** WCAG AA for body text. Headings over a wallpaper are body-sized here. */
export const TARGET_CONTRAST = 4.5;

/** What the eye actually sees where text meets the wallpaper. */
export function effectiveBackground(media: string, themeBackground: string, dim: number): string {
  const m = hexToRgb(media);
  const t = hexToRgb(themeBackground);
  const a = Math.max(0, Math.min(1, dim));
  return rgbToHex({
    r: m.r + (t.r - m.r) * a,
    g: m.g + (t.g - m.g) * a,
    b: m.b + (t.b - m.b) * a,
  });
}

/**
 * The least scrim that keeps `text` readable over `media`.
 *
 * Solved by bisection rather than algebra. Contrast is a ratio of luminances,
 * luminance is piecewise and gamma-corrected, and the blend happens in sRGB
 * space — inverting that analytically is a page of algebra with a sign error
 * waiting in it. The function is monotonic in `dim` for a fixed pair, so
 * twenty bisection steps land within 0.001 and take microseconds.
 *
 * Returns null when even a full scrim cannot get there, which happens when the
 * text colour is simply too close to the theme background to work at all —
 * a problem the wallpaper did not cause and cannot fix.
 */
export function minimumDim(
  media: string,
  themeBackground: string,
  text: string,
  target = TARGET_CONTRAST,
): number | null {
  if (contrast(text, effectiveBackground(media, themeBackground, 1)) < target) {
    return null;
  }
  if (contrast(text, media) >= target) {
    return 0;
  }

  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (low + high) / 2;
    if (contrast(text, effectiveBackground(media, themeBackground, mid)) >= target) {
      high = mid;
    } else {
      low = mid;
    }
  }
  // Round up to a hundredth: landing exactly on the threshold leaves no margin
  // for a brighter patch of the photo than its average.
  return Math.ceil(high * 100) / 100;
}

export interface Readability {
  /** The wallpaper's representative colour. */
  media: string;
  /** What the app should draw text in over this wallpaper. */
  text: string;
  /** The scrim that keeps it readable. */
  dim: number;
  /** Contrast that combination achieves. */
  ratio: number;
  /**
   * True when the theme's own text colour survives and only the scrim had to
   * move. The app looks most like itself in that case, so it is preferred even
   * when flipping the text would allow a lighter scrim.
   */
  keptThemeText: boolean;
}

/**
 * Decide text colour and scrim together.
 *
 * Order matters. Keeping the theme's text and adjusting the scrim is tried
 * first, because a wallpaper should change the picture behind the app, not the
 * app. Only when that needs an unreasonably heavy scrim — more than
 * `maxComfortableDim`, at which point the photograph is barely visible and the
 * user has effectively lost the thing they chose — is the text flipped to
 * whichever of black or white the media wants, which usually allows a much
 * lighter scrim and keeps the picture.
 */
export function readabilityFor(
  media: string,
  themeBackground: string,
  themeText: string,
  maxComfortableDim = 0.6,
): Readability {
  const keptDim = minimumDim(media, themeBackground, themeText);

  if (keptDim !== null && keptDim <= maxComfortableDim) {
    return {
      media,
      text: themeText,
      dim: keptDim,
      ratio: contrast(themeText, effectiveBackground(media, themeBackground, keptDim)),
      keptThemeText: true,
    };
  }

  // Flip to whatever the photo itself wants.
  const flipped = onColor(media);
  const flippedDim = minimumDim(media, themeBackground, flipped);

  // If flipping does not help either, keep the theme's text and use whatever
  // scrim gets closest — a slightly-under-AA app that still looks like itself
  // beats an unreadable one that does not.
  if (flippedDim === null) {
    const dim = keptDim ?? 1;
    return {
      media,
      text: themeText,
      dim,
      ratio: contrast(themeText, effectiveBackground(media, themeBackground, dim)),
      keptThemeText: true,
    };
  }

  return {
    media,
    text: flipped,
    dim: flippedDim,
    ratio: contrast(flipped, effectiveBackground(media, themeBackground, flippedDim)),
    keptThemeText: false,
  };
}

/** Whether a colour reads as a bright image or a dark one. */
export function isBrightMedia(media: string): boolean {
  return luminance(media) > 0.5;
}
