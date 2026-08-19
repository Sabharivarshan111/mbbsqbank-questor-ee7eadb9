import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme } from '@/theme';
import RootNavigator from '@/navigation/RootNavigator';
import { hydrateProgress, reconcileProgress } from '@/lib/progress';
import { hydrateProfile } from '@/hooks/useProfile';
import { initializeAds } from '@/lib/ads';
import { hydratePremium, usePremiumSync } from '@/lib/premium';
import { hydrateWallpaper } from '@/hooks/useWallpaper';
import { DailyAdConsent } from '@/components/DailyAdConsent';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Shell() {
  const { theme, colors } = useTheme();
  // Keeps the ad layer's synchronous premium check up to date.
  usePremiumSync();

  useEffect(() => {
    // Load saved completion state before the first counts render, then try a
    // best-effort cloud merge (a no-op when signed out or offline).
    hydrateProgress().then(() => {
      reconcileProgress().catch(() => {});
    });
    // Profile, streak and XP; all cloud steps are best-effort.
    hydrateProfile().catch(() => {});
    // The chosen wallpaper, before the first paint of Home.
    hydrateWallpaper().catch(() => {});
    // Load the cached ad-free expiry before any ad decision is made, then
    // start the SDK and preload so the first ad has no wait.
    hydratePremium().then(() => initializeAds()).catch(() => {});
  }, []);

  const navTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {/* Android draws edge-to-edge in RN 0.87, so the bar is translucent and
          only the icon style is ours to set. */}
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <RootNavigator />
      <DailyAdConsent />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    // Outside the providers on purpose: if the thing that throws is a provider,
    // a boundary nested inside it never runs.
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
