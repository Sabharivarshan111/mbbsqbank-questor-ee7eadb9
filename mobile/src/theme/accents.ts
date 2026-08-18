/**
 * Theme accents, and the rules that keep a chosen one readable.
 *
 * The web app's "Create Your Own Theme" asks for four free colours —
 * background, text, accent, card — with a live preview to check the result.
 * That is the wrong shape for the problem. Four independent choices is a
 * four-dimensional space in which most points are unreadable, the preview
 * makes it the user's job to notice, and a preview cannot show them the one
 * screen where their pick fails. People end up with white-on-yellow body text
 * and no idea why the app got harder to read.
 *
 * Apple's answer to this, in every place it offers personalisation, is to take
 * **one** decision from the user and derive the rest: pick an accent, the
 * system builds a palette around it that cannot fail. That is what this does.
 * Base (light or dark) plus accent is two choices, both safe, and every
 * combination is legible by construction.
 *
 * What an accent may touch:
 *   • `accent` and `fuchsia` — the brand hue, used for gradients and highlights
 *   • nothing else
 *
 * What it may never touch: `success`, `warning`, `danger`. Those carry meaning
 * — a tick, an importance star, a failure — and a green that is green because
 * somebody liked green is no longer information. Same for `background`, `text`
 * and the surface ramp, which are what the contrast guarantees are built on.
 */

export interface Accent {
  key: string;
  name: string;
  /** For a dark base. Lighter, so it holds up against near-black. */
  dark: string;
  /** For a light base. Deeper, so it holds up against white. */
  light: string;
}

/**
 * A curated set rather than a colour wheel.
 *
 * A free HSV picker is how you get #2D1B2E as a "card" colour: technically a
 * choice, practically indistinguishable from the background it sits on. Each
 * of these is specified twice — once for each base — because a hue that reads
 * well on black is washed out on white, and the same value cannot serve both.
 * Contrast against the base was the constraint each pair was picked under.
 */
export const ACCENTS: Accent[] = [
  { key: 'fuchsia', name: 'Fuchsia', dark: '#E879F9', light: '#C026D3' },
  { key: 'rose', name: 'Rose', dark: '#FB7185', light: '#E11D48' },
  { key: 'amber', name: 'Amber', dark: '#FBBF24', light: '#B45309' },
  { key: 'emerald', name: 'Emerald', dark: '#34D399', light: '#047857' },
  { key: 'cyan', name: 'Cyan', dark: '#22D3EE', light: '#0E7490' },
  { key: 'indigo', name: 'Indigo', dark: '#818CF8', light: '#4338CA' },
  { key: 'violet', name: 'Violet', dark: '#A78BFA', light: '#6D28D9' },
];

export const DEFAULT_ACCENT = 'fuchsia';

export function accentByKey(key: string): Accent {
  return ACCENTS.find(a => a.key === key) ?? ACCENTS[0];
}

/** The accent's colour for a base. */
export function accentColor(key: string, base: 'dark' | 'light'): string {
  const accent = accentByKey(key);
  return base === 'dark' ? accent.dark : accent.light;
}

/* ---------------------------------------------------------------------------
 * Contrast
 *
 * Kept here rather than imported so the theme layer has no dependencies, and
 * so the check that guarantees legibility cannot be dropped by a refactor
 * somewhere else.
 * ------------------------------------------------------------------------- */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const r = channel(parseInt(v.slice(0, 2), 16));
  const g = channel(parseInt(v.slice(2, 4), 16));
  const b = channel(parseInt(v.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Black or white, whichever is readable on `background`.
 *
 * Used for text sitting *on* an accent — a filled button, a badge. Hardcoding
 * white is what makes text on a yellow or cyan button unreadable, and it is
 * the single most common failure in themeable UIs.
 */
export function onColor(background: string): string {
  return contrast(background, '#FFFFFF') >= contrast(background, '#000000')
    ? '#FFFFFF'
    : '#000000';
}
