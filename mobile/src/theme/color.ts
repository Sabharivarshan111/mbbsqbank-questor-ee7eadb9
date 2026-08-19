/**
 * Colour maths for the theme editor.
 *
 * No imports on purpose: `scripts/contrast-check.mjs` loads this off-device to
 * prove every shipped theme is readable, and a dependency on React Native
 * would put it out of reach.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function hexToRgb(hex: string): Rgb {
  const v = hex.replace('#', '');
  const full =
    v.length === 3
      ? v
          .split('')
          .map(c => c + c)
          .join('')
      : v;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map(c => clamp255(c).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function hexToHsv(hex: string): Hsv {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d) % 6;
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
      ? [x, c, 0]
      : h < 180
      ? [0, c, x]
      : h < 240
      ? [0, x, c]
      : h < 300
      ? [x, 0, c]
      : [c, 0, x];
  return rgbToHex({ r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 });
}

/** Blend two colours. `amount` is how much of `b` ends up in the result. */
export function mix(a: string, b: string, amount: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

/* ---- contrast, shared with the accent model ---------------------------- */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever is readable on `background`. */
export function onColor(background: string): string {
  return contrast(background, '#FFFFFF') >= contrast(background, '#000000')
    ? '#FFFFFF'
    : '#000000';
}

/** A colour is "dark" when white text would read better on it than black. */
export function isDark(hex: string): boolean {
  return onColor(hex) === '#FFFFFF';
}

/** Valid 3- or 6-digit hex, with or without the hash. */
export function isHex(value: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim().replace('#', '');
  const full =
    v.length === 3
      ? v
          .split('')
          .map(c => c + c)
          .join('')
      : v;
  return `#${full.toUpperCase()}`;
}

/**
 * A lit variant of `base`, for the far stop of a gradient drawn *under*
 * `label` text.
 *
 * A gradient needs a second colour, and a theme only ever hands us four. The
 * safe direction is away from the label: mixing the accent towards white when
 * the label is black (or towards black when it is white) can only widen the
 * luminance gap the label depends on, so a gradient can never make the thing
 * written on it harder to read. Picking a second hue instead would be a fifth
 * colour the user never chose, with no such guarantee.
 */
export function lit(base: string, label: string, amount = 0.22): string {
  return mix(base, isDark(label) ? '#FFFFFF' : '#000000', amount);
}
