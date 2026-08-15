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
 * Mirrors the CSS custom properties in src/index.css so the native app is the
 * same design, not a lookalike. The dark theme is pure black with a *white*
 * primary — that is why the hero title reads as a white-to-pink gradient and
 * the centre timer button is a white disc.
 */
const DARK: Palette = {
  background: '#000000', // --background: 0 0% 0%
  card: '#080808', // --card: 0 0% 3%
  cardElevated: '#1A1A1A', // --muted: 0 0% 10%
  muted: '#1A1A1A',
  border: '#333333', // --border: 0 0% 20%
  text: '#FFFFFF', // --foreground: 0 0% 100%
  textMuted: '#B3B3B3', // --muted-foreground: 0 0% 70%
  primary: '#FFFFFF', // --primary: 0 0% 100%
  primaryText: '#000000', // --primary-foreground: 0 0% 0%
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
  background: '#FFFFFF', // --background: 0 0% 100%
  card: '#FAFAFA', // --card: 0 0% 98%
  cardElevated: '#EBEBEB', // --muted: 0 0% 92%
  muted: '#EBEBEB',
  border: '#D9D9D9', // --border: 0 0% 85%
  text: '#0A0A0A', // --foreground: 0 0% 3.9%
  textMuted: '#737373', // --muted-foreground: 0 0% 45.1%
  primary: '#171717', // --primary: 0 0% 9%
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // The web app ships dark by default; keep that rather than following the OS.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
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
