import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { isDark } from '@/theme/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDailyAd } from '@/lib/dailyAd';
import { tick } from '@/lib/haptics';
import {
  TEXT_SIZE_DEFAULT,
  TextScaleContext,
  clampTextSize,
  parseTextSize,
  type TextSize,
} from '@/theme/textScale';
import {
  paletteFrom,
  presetByKey,
  PRESETS,
  type CustomPalette,
  type Material,
  type PresetKey,
} from '@/theme/presets';

export type ThemeName = 'light' | 'dark';
/**
 * Which theme is chosen. Beyond light/dark/system there are the named presets
 * and `custom`, which resolves to whatever is saved as My Theme.
 */
export type ThemePreference = PresetKey;

export interface Palette {
  background: string;
  card: string;
  cardElevated: string;
  muted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  /** Fixed accent hues, matching the Tailwind colours the web app uses. */
  cyan: string;
  emerald: string;
  fuchsia: string;
  green: string;
  violet: string;
  /** Semantic roles: completion ticks, importance badges, AI highlights. */
  success: string;
  warning: string;
  danger: string;
  accent: string;
  /**
   * Readable text on top of `accent`. Never assume white: an amber or cyan
   * accent needs black, and hardcoding white is the most common way a
   * themeable UI ends up with an unreadable button.
   */
  onAccent: string;
  /**
   * How surfaces are drawn. `glass` turns on the Liquid Glass treatment in
   * GlassSurface: translucent fill, specular rim, float. Components that do
   * not care can ignore it and stay solid.
   */
  material: Material;
}

/**
 * Started as a mirror of src/index.css and has since diverged, deliberately, in
 * one respect: **surface separation**.
 *
 * The web values put `card` at 3% lightness on a 0% background and, in light
 * mode, 98% on 100%. Those are 2–3 point steps — invisible. Every card in the
 * app was being held together by its 1px border alone, which is why the screens
 * read as a flat wall of outlines rather than as layers. Material weight is
 * what encodes hierarchy (apple-design §12), and there was none to read.
 *
 * So the surfaces now step properly: background → card → cardElevated is a
 * visible progression at both ends. The neutrals also carry a slight cool cast
 * rather than being pure grey, which is what stops a dark UI looking like an
 * unstyled default.
 *
 * What did NOT change, because it is the app's identity: the pure-black dark
 * background (it is an OLED win as well as a look), the *white* primary — that
 * is why the hero title reads as a white-to-pink gradient and the centre timer
 * button is a white disc — and every accent hue.
 *
 * The web app keeps its own values. If the two are ever reunified, bring the
 * web up to these rather than flattening these back down.
 */
const DARK: Palette = {
  background: '#000000', // unchanged: pure black, OLED and identity
  card: '#0E0E11', // was #080808 — a card you can actually see
  cardElevated: '#191920', // was #1A1A1A, now with the same cool cast
  muted: '#191920',
  border: '#2C2C33', // was #333333 — softer, so it frames rather than fences
  text: '#FFFFFF',
  textMuted: '#A8A8B3', // was #B3B3B3
  primary: '#FFFFFF', // unchanged: identity
  primaryText: '#000000',
  cyan: '#22D3EE',
  emerald: '#34D399',
  fuchsia: '#E879F9',
  green: '#22C55E',
  violet: '#8B5CF6',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#F87171',
  accent: '#E879F9',
  onAccent: '#000000',
  material: 'solid',
};


const STORAGE_KEY = 'orbit:theme-preference';
const CUSTOM_KEY = 'orbit:theme-custom';
const TEXT_SIZE_KEY = 'orbit:text-size';

interface ThemeContextValue {
  theme: ThemeName;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** The saved My Theme, or null until one is created. */
  custom: CustomPalette | null;
  /** Save (or clear) My Theme. Saving does not switch to it. */
  setCustom: (palette: CustomPalette | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: DARK,
  preference: 'dark',
  setPreference: () => {},
  toggleTheme: () => {},
  textSize: TEXT_SIZE_DEFAULT,
  setTextSize: () => {},
  custom: null,
  setCustom: () => {},
});

export function ThemeProvider({
  children,
  initialPreference = 'dark',
}: {
  children: React.ReactNode;
  /**
   * Starting theme before the stored preference loads. The app never passes
   * this — it exists so the screenshot harness can capture both themes without
   * a stored preference to fight over.
   */
  initialPreference?: ThemePreference;
}) {
  const systemScheme = useColorScheme();
  // The web app ships dark by default; keep that rather than following the OS.
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [textSize, setTextSizeState] = useState<TextSize>(TEXT_SIZE_DEFAULT);
  const [custom, setCustomState] = useState<CustomPalette | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        const known: string[] = [...PRESETS.map(p => p.key), 'system', 'custom'];
        if (value && known.includes(value)) {
          setPreferenceState(value as ThemePreference);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(CUSTOM_KEY)
      .then(value => {
        if (!value) {
          return;
        }
        try {
          const parsed = JSON.parse(value) as Partial<CustomPalette>;
          if (parsed.background && parsed.text && parsed.accent && parsed.card) {
            setCustomState(parsed as CustomPalette);
          }
        } catch {
          // A corrupt entry should not stop the app theming itself.
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(TEXT_SIZE_KEY)
      .then(value => {
        // parseTextSize also understands what the three-preset version wrote,
        // so an update does not quietly reset the setting.
        const parsed = parseTextSize(value);
        if (parsed !== null) {
          setTextSizeState(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const setTextSize = useCallback((next: TextSize) => {
    const value = clampTextSize(next);
    setTextSizeState(value);
    AsyncStorage.setItem(TEXT_SIZE_KEY, String(value)).catch(() => {});
    // No ad here. Text size is an accessibility setting, and gating one behind
    // an ad is not a trade anybody should be asked to make.
  }, []);

  const setCustom = useCallback((next: CustomPalette | null) => {
    setCustomState(next);
    if (next) {
      AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next)).catch(() => {});
    } else {
      AsyncStorage.removeItem(CUSTOM_KEY).catch(() => {});
    }
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // One light tap on the commit. This lives here rather than on the header
    // button so the chips on My Progress feel identical — the same action
    // should feel the same wherever it is started (SKILL §16 Familiarity).
    // Hydration uses setPreferenceState directly, so restoring a saved theme
    // at launch stays silent.
    tick();
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    // Once-a-day rewarded ad for the "theme" bucket.
    requestDailyAd('theme').catch(() => undefined);
  }, []);

  /**
   * The four chosen colours for whatever is selected.
   *
   * `system` follows the OS between the light and dark presets. `custom`
   * resolves to My Theme, falling back to dark if the preference was somehow
   * saved before a theme was — a stored preference pointing at nothing should
   * not leave the app unstyled.
   */
  const chosen: CustomPalette = useMemo(() => {
    if (preference === 'system') {
      return presetByKey(systemScheme === 'light' ? 'light' : 'dark')!.palette!;
    }
    if (preference === 'custom') {
      return custom ?? presetByKey('dark')!.palette!;
    }
    return presetByKey(preference)?.palette ?? presetByKey('dark')!.palette!;
  }, [preference, systemScheme, custom]);

  /**
   * Light or dark is now a *property* of the chosen colours rather than the
   * choice itself: it is whether the background is dark. Everything that keys
   * off `theme` — the status bar, the navigation container, the moon/sun icon
   * — then stays right for a custom theme too, which it would not if this were
   * still the name of a preset.
   */
  const theme: ThemeName = isDark(chosen.background) ? 'dark' : 'light';

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  /**
   * A material belongs to a named preset, not to a set of colours, so a custom
   * theme is always solid — there is nothing in four hex values that could say
   * "and make it glass".
   */
  const material: Material =
    (preference !== 'custom' && preference !== 'system'
      ? presetByKey(preference)?.material
      : undefined) ?? 'solid';

  const colors = useMemo<Palette>(() => paletteFrom(chosen, material), [chosen, material]);

  const value = useMemo(
    () => ({
      theme,
      colors,
      preference,
      setPreference,
      toggleTheme,
      textSize,
      setTextSize,
      custom,
      setCustom,
    }),
    [theme, colors, preference, setPreference, toggleTheme, textSize, setTextSize, custom, setCustom],
  );

  return (
    <ThemeContext.Provider value={value}>
      <TextScaleContext.Provider value={textSize}>
        {children}
      </TextScaleContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Tailwind-style colour with alpha, e.g. withAlpha('#22C55E', 0.15). */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
