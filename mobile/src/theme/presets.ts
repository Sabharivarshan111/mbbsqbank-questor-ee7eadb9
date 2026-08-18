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

/**
 * How surfaces are drawn, as opposed to what colour they are.
 *
 * `solid` is an opaque card with a hairline border — what every theme here
 * used before. `glass` is Apple's Liquid Glass treatment: a translucent layer
 * that sits *over* the background rather than replacing it, with a specular
 * highlight along its lit edge.
 *
 * It is a separate axis from the four colours on purpose. Glass is not a
 * palette — you cannot express "translucent, lit from above, floating" as a
 * background hex — and keeping it separate means the custom editor still deals
 * in four colours while a preset can carry a material as well.
 */
export type Material = 'solid' | 'glass';

export interface Preset {
  key: PresetKey;
  name: string;
  /** Absent for `system` and `custom`, which resolve at runtime. */
  palette?: CustomPalette;
  /** Defaults to solid. */
  material?: Material;
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
    /**
     * Modelled on Apple's Liquid Glass (iOS 26), within what React Native can
     * honestly draw. What the material actually is, and what survives the
     * port:
     *
     *   • **Translucency over an opaque fill.** Glass shows what is behind it.
     *     The card is a white wash at partial alpha rather than a solid, so
     *     the background reads through it and two stacked surfaces visibly
     *     differ in depth rather than just in lightness.
     *   • **A specular highlight on the lit edge.** The single most
     *     identifiable feature: a bright hairline along the top, fading down
     *     the sides, as if a light source sits above the screen. Drawn as a
     *     gradient rim in GlassSurface.
     *   • **Concentric radii and float.** Larger corners and a soft shadow, so
     *     a panel reads as sitting above the page rather than cut into it.
     *   • **A cool, bright ground.** Glass has no colour of its own; it takes
     *     it from what is behind. A near-white cool background is what lets
     *     the translucency read at all — over black, a white wash at 60% is
     *     just a grey card.
     *
     * What does NOT survive: real refraction and background blur. Both need a
     * backdrop filter, which React Native has no equivalent for without a
     * native module (react-native-blur or Skia). Faking a blur by drawing a
     * lighter rectangle is what makes an imitation look cheap, so it is left
     * out rather than approximated. See .claude/skills/apple-design/README.md,
     * where "no backdrop blur" is recorded as a deliberate departure.
     *
     * Text stays near-black: "glass" is a surface treatment, never a licence
     * for grey-on-grey type.
     */
    palette: { background: '#EAEFF6', text: '#0F1419', accent: '#2F7DEC', card: '#FFFFFF' },
    material: 'glass',
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
export function paletteFrom(custom: CustomPalette, material: Material = 'solid') {
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
    material,
  };
}

export function presetByKey(key: PresetKey): Preset | undefined {
  return PRESETS.find(p => p.key === key);
}
