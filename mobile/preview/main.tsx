// Android renders the app in Roboto (React Native's default face, and the same
// font the web app inherits from Tailwind's stack). Desktop Linux has no
// Roboto, so the preview would otherwise fall back to Liberation Sans and
// misrepresent the typography. react-native-web's default font stack already
// names Roboto, so loading it here is enough.
import '@fontsource-variable/roboto';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import type { InitialState } from '@react-navigation/native';
import { ThemeProvider, useTheme } from '@/theme';
import RootNavigator from '@/navigation/RootNavigator';
import { hydrateProgress } from '@/lib/progress';
import { hydrateProfile } from '@/hooks/useProfile';
import { DailyAdConsent } from '@/components/DailyAdConsent';
import { hydratePremium } from '@/lib/premium';

/**
 * Preview entry point. Mirrors App.tsx, minus the cloud sync, and lets the
 * screenshot script pick which screen to open via the query string:
 *
 *   ?screen=timer            → opens the Timer tab
 *   ?screen=browse&node=…    → opens a topic inside the Browse stack
 */

const TAB_ORDER = ['Home', 'Notes', 'Timer', 'AskAI', 'Progress'] as const;
type TabName = (typeof TAB_ORDER)[number];

const params = new URLSearchParams(window.location.search);
const screen = (params.get('screen') ?? 'home').toLowerCase();
const nodePath = params.get('node');
const nodeYear = params.get('year') ?? 'second-year';
const nodeTitle = params.get('title') ?? 'Topic';
const themeParam = params.get('theme') === 'light' ? 'light' : 'dark';

const tabIndex = Math.max(
  0,
  TAB_ORDER.findIndex(name => name.toLowerCase() === screen),
);

function buildInitialState(): InitialState {
  const routes: { name: TabName; state?: unknown }[] = TAB_ORDER.map(name => ({ name }));
  // Deep-link into the question-bank stack that lives inside the Home tab.
  if (nodePath || screen === 'browse') {
    const stackRoutes: { name: string; params?: unknown }[] = [{ name: 'HomeMain' }];
    if (screen === 'browse' || nodePath) {
      stackRoutes.push({ name: 'BrowseHome', params: { year: nodeYear } });
    }
    if (nodePath) {
      stackRoutes.push({
        name: 'BrowseNode',
        params: { year: nodeYear, path: nodePath.split(','), title: nodeTitle },
      });
    }
    routes[0] = {
      name: 'Home',
      state: { index: stackRoutes.length - 1, routes: stackRoutes },
    };
  }
  return { index: Math.max(0, tabIndex), routes } as InitialState;
}

// Phone-shaped safe area so padding matches a real handset.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 40, left: 0, right: 0, bottom: 16 },
  ...initialWindowMetrics,
};

function Shell() {
  const { theme, colors } = useTheme();
  React.useEffect(() => {
    hydrateProgress();
    hydrateProfile().catch(() => {});
    hydratePremium().catch(() => {});
  }, []);

  const base = theme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme} initialState={buildInitialState()}>
      <RootNavigator />
      <DailyAdConsent />
    </NavigationContainer>
  );
}

createRoot(document.getElementById('root')!).render(
  <SafeAreaProvider initialMetrics={METRICS}>
    <ThemeProvider initialPreference={themeParam}>
      <Shell />
    </ThemeProvider>
  </SafeAreaProvider>,
);
