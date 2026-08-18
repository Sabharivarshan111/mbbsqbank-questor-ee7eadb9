import { isDark, mix, onColor } from '@/theme/color';

/**
 * The four colours a user picks, and the presets built on them.
 *
 * Matches the web app's "Create Your Own Theme": background, text, accent,
 * card. Everything else in the palette is derived from those, because asking
 * for eleven colours would be unusable and asking for four is what the app
 * already offers on the web.
 */
export interface CustomPalette {
  background: string;
  text: string;
  accent: string;
  card: string;
}

/** The named themes in the picker. `custom` is whatever is saved as My Theme. */
export type PresetKey = 'dark' | 'light' | 'blackpink' | 'liquidglass' | 'custom' | 'system';

export interface Preset {
  key: PresetKey;
  name: string;
  /** Absent for `system` and `custom`, which resolve at runtime. */
  palette?: CustomPalette;
}

/**
 * Named presets, in the order the web app lists them.
 *
 * Black Pink and Liquid Glass are the two the web app ships beyond light and
 * dark; their values are read from the published UI rather than invented, so
 * somebody switching between the two apps sees the same thing.
 */
export const PRESETS: Preset[] = [
  {
    key: 'dark',
    name: 'Dark',
    palette: { background: '#000000', text: '#FFFFFF', accent: '#E879F9', card: '#0E0E11' },
  },
  {
    key: 'light',
    name: 'Light',
    palette: { background: '#FFFFFF', text: '#0A0A0B', accent: '#C026D3', card: '#F6F6F9' },
  },
  {
    key: 'blackpink',
    name: 'Black Pink',
    palette: { background: '#000000', text: '#FFFFFF', accent: '#FF2D78', card: '#141017' },
  },
  {
    key: 'liquidglass',
    name: 'Liquid Glass',
    // Cool, bright and low-contrast between surfaces — the frosted look the
    // name refers to. Text stays near-black so the contrast guarantee holds;
    // "glass" is a surface treatment, not an excuse for grey-on-grey type.
    palette: { background: '#EEF2F7', text: '#101418', accent: '#2F7DEC', card: '#FFFFFF' },
  },
];

/**
 * Starting points for the custom editor, matching the web app's quick presets.
 *
 * They exist because a blank colour picker is a bad first move: most people
 * want "something like this, but greener", not to specify four colours from
 * nothing. Each is a complete, readable four-colour set to nudge from.
 */
export const QUICK_PRESETS: { name: string; palette: CustomPalette }[] = [
  {
    name: 'Ocean',
    palette: { background: '#0B1B2B', text: '#F2F7FB', accent: '#34C3D4', card: '#12293D' },
  },
  {
    name: 'Sunset',
    palette: { background: '#1E1119', text: '#FFF4EC', accent: '#FF6B35', card: '#2C1A24' },
  },
  {
    name: 'Forest',
    palette: { background: '#0C1A12', text: '#EAF6EE', accent: '#3DD68C', card: '#14291D' },
  },
  {
    name: 'Lavender',
    palette: { background: '#FBFAFF', text: '#1B1630', accent: '#7C4DFF', card: '#F1EEFC' },
  },
];

/** Semantic colours never come from a theme. See the note in ThemeSheet. */
const SEMANTIC_DARK = { success: '#22C55E', warning: '#FBBF24', danger: '#F87171' };
const SEMANTIC_LIGHT = { success: '#16A34A', warning: '#D97706', danger: '#DC2626' };
const HUES_DARK = { cyan: '#22D3EE', emerald: '#34D399', green: '#22C55E', violet: '#8B5CF6' };
const HUES_LIGHT = { cyan: '#0891B2', emerald: '#059669', green: '#16A34A', violet: '#7C3AED' };

/**
 * Expand four chosen colours into the eighteen the app actually uses.
 *
 * The derived ones are all *relationships*, which is why they can be computed
 * rather than asked for:
 *
 *   • `cardElevated` is the card lifted towards the text colour — a second
 *     surface has to be visible against the first or the hierarchy is carried
 *     by borders alone.
 *   • `border` sits between card and text, far enough to frame and not so far
 *     it fences.
 *   • `textMuted` is text faded towards the background, which is what "muted"
 *     means; picking it independently is how you get unreadable secondary text.
 *   • `primary` is the text colour and `primaryText` the background, so a
 *     filled button is always the inverse of the page — that is what keeps the
 *     white timer disc and the inverted chips working in every theme.
 *
 * Semantic colours (success, warning, danger) and the fixed hues are taken
 * from whichever base the chosen background is closer to. They are never
 * derived from the user's picks: a red that means "wrong" has to stay red.
 */
export function paletteFrom(custom: CustomPalette) {
  const dark = isDark(custom.background);
  const semantic = dark ? SEMANTIC_DARK : SEMANTIC_LIGHT;
  const hues = dark ? HUES_DARK : HUES_LIGHT;

  return {
    background: custom.background,
    card: custom.card,
    cardElevated: mix(custom.card, custom.text, 0.08),
    muted: mix(custom.card, custom.text, 0.08),
    border: mix(custom.card, custom.text, 0.18),
    text: custom.text,
    textMuted: mix(custom.text, custom.background, 0.38),
    primary: custom.text,
    primaryText: custom.background,
    ...hues,
    fuchsia: custom.accent,
    accent: custom.accent,
    onAccent: onColor(custom.accent),
    ...semantic,
  };
}

export function presetByKey(key: PresetKey): Preset | undefined {
  return PRESETS.find(p => p.key === key);
}
