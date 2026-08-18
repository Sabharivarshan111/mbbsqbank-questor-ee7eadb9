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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScrollView, Text, View } from 'react-native';
import { NotesContentView } from '@/components/NotesContentView';
import { SAMPLE_NOTES } from './notesSample';
import { McqCard } from '@/components/McqCard';
import { ThinkingDots } from '@/components/ThinkingDots';
import { MessageEntrance } from '@/components/MessageEntrance';
import { RevealText } from '@/components/RevealText';
import { AnswerActions, followUpsFor } from '@/components/AnswerActions';
import { parseMcqs } from '@/lib/askAi';
import { SAMPLE_MCQ_RESPONSE } from './mcqSample';

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

/**
 * ?screen=notesdemo — the handwritten-notes renderer with a fixture.
 *
 * The real notes come from an edge function that costs AI quota and takes
 * minutes; this shows the same component with fixed content so layout work can
 * be reviewed instantly. Preview only — see notesSample.ts.
 */
function NotesRendererDemo() {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <NotesContentView content={SAMPLE_NOTES} />
    </ScrollView>
  );
}

/**
 * ?screen=mcqdemo — the MCQ cards a double tap produces.
 *
 * Same reason as notesdemo: the real ones come from ask-gemini, which costs
 * quota and needs a key. This renders the parser's output for a fixed response,
 * so the card layout and the answered/unanswered states can be reviewed.
 */
function McqDemo() {
  const { colors } = useTheme();
  const items = parseMcqs(SAMPLE_MCQ_RESPONSE) ?? [];
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 10 }}>
      {items.map((item, i) => (
        <McqCard key={i} item={item} index={i} />
      ))}
    </ScrollView>
  );
}

/** ?screen=chatdemo — the chat's motion pieces, isolated for review. */
function ChatMotionDemo() {
  const { colors } = useTheme();
  const [answered, setAnswered] = React.useState(false);
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}>
      <ThinkingDots label="Thinking…" />
      <MessageEntrance>
        <View
          style={{
            maxWidth: '88%',
            alignSelf: 'flex-end',
            backgroundColor: colors.cardElevated,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
            Discuss the aetiology of jaundice
          </Text>
        </View>
      </MessageEntrance>
      <MessageEntrance>
        <View
          style={{
            maxWidth: '88%',
            alignSelf: 'flex-start',
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}>
          <RevealText
            text={
              'Jaundice is yellowish discolouration of skin and sclera caused by hyperbilirubinaemia, classified as pre-hepatic, hepatic and post-hepatic by the level at which bilirubin handling fails. Pre-hepatic causes are haemolytic; hepatic causes include viral hepatitis and cirrhosis; post-hepatic causes are obstructive, most often gallstones or carcinoma of the head of pancreas.'
            }
            onDone={() => setAnswered(true)}
            style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}
          />
        </View>
        {answered ? (
          <AnswerActions
            followUps={followUpsFor('Discuss the aetiology of jaundice')}
            onPick={() => {}}
            onRetry={() => {}}
          />
        ) : null}
      </MessageEntrance>
    </ScrollView>
  );
}

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

  if (screen === 'notesdemo') {
    return <NotesRendererDemo />;
  }

  if (screen === 'mcqdemo') {
    return <McqDemo />;
  }

  if (screen === 'chatdemo') {
    return <ChatMotionDemo />;
  }

  return (
    <NavigationContainer theme={navTheme} initialState={buildInitialState()}>
      <RootNavigator />
      <DailyAdConsent />
    </NavigationContainer>
  );
}

createRoot(document.getElementById('root')!).render(
  // Mirrors App.tsx, including the boundary sitting outside the providers.
  <ErrorBoundary>
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider initialPreference={themeParam}>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  </ErrorBoundary>,
);
