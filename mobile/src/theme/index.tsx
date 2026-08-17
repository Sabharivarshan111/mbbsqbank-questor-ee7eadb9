import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDailyAd } from '@/lib/dailyAd';
import { tick } from '@/lib/haptics';
import { TEXT_SIZE_SCALE, TextScaleContext, type TextSize } from '@/theme/textScale';

export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

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
};

const LIGHT: Palette = {
  background: '#FFFFFF',
  card: '#F6F6F9', // was #FAFAFA — 98% on 100% was not a surface
  cardElevated: '#ECECF1', // was #EBEBEB
  muted: '#ECECF1',
  border: '#DCDCE4', // was #D9D9D9
  text: '#0A0A0B',
  textMuted: '#6B6B78', // was #737373 — also lifts contrast on white
  primary: '#171717',
  primaryText: '#FAFAFA',
  cyan: '#0891B2',
  emerald: '#059669',
  fuchsia: '#C026D3',
  green: '#16A34A',
  violet: '#7C3AED',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  accent: '#C026D3',
};

const STORAGE_KEY = 'orbit:theme-preference';
const TEXT_SIZE_KEY = 'orbit:text-size';

interface ThemeContextValue {
  theme: ThemeName;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: DARK,
  preference: 'dark',
  setPreference: () => {},
  toggleTheme: () => {},
  textSize: 'default',
  setTextSize: () => {},
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
  const [textSize, setTextSizeState] = useState<TextSize>('default');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(TEXT_SIZE_KEY)
      .then(value => {
        if (value === 'default' || value === 'large' || value === 'larger') {
          setTextSizeState(value);
        }
      })
      .catch(() => {});
  }, []);

  const setTextSize = useCallback((next: TextSize) => {
    setTextSizeState(next);
    AsyncStorage.setItem(TEXT_SIZE_KEY, next).catch(() => {});
    // No ad here. Text size is an accessibility setting, and gating one behind
    // an ad is not a trade anybody should be asked to make.
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

  const theme: ThemeName =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({
      theme,
      colors: theme === 'dark' ? DARK : LIGHT,
      preference,
      setPreference,
      toggleTheme,
      textSize,
      setTextSize,
    }),
    [theme, preference, setPreference, toggleTheme, textSize, setTextSize],
  );

  return (
    <ThemeContext.Provider value={value}>
      <TextScaleContext.Provider value={TEXT_SIZE_SCALE[textSize]}>
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
