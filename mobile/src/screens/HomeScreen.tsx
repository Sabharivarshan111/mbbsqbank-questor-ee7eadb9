import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Sheet } from '@/components/Sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flag,
  Flame,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Sparkles,
  Sun,
  Timer as TimerIcon,
  TrendingUp,
  Trophy,
  Type,
} from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import { GradientFill } from '@/components/Gradient';
import {
  collectAllQuestions,
  getSubjects,
  SUBJECT_ICON,
  YEAR_KEYS,
  YEAR_LABEL,
  type YearKey,
} from '@/lib/questionBank';
import { useCountDone } from '@/hooks/useProgress';
import { useProfile } from '@/hooks/useProfile';
import { KEY_TO_YEAR } from '@/lib/profile';
import { readFocusMinutes, formatFocusTime } from '@/lib/focusStats';
import type { HomeStackParamList, RootTabParamList } from '@/navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

const HERO_SLIDES = [
  {
    title: 'Welcome to Orbit!',
    body: "Every great journey begins with a single step. Stay consistent, stay curious, and you'll achieve greatness.",
  },
  {
    title: 'AI-Powered Learning',
    body: 'Triple-tap any question to instantly ask AI. Double-tap to generate MCQs from any topic.',
  },
  {
    title: 'Track Your Journey',
    body: 'Handwritten notes, spaced revision, and progress rings — everything you need in one orbit.',
  },
];

// Matches SUBJECT_GRADIENTS in src/components/shell/HomeTab.tsx.
const SUBJECT_GRADIENT: Record<string, [string, string]> = {
  anatomy: ['rgba(147,51,234,0.40)', 'rgba(49,46,129,0.60)'],
  physiology: ['rgba(192,38,211,0.40)', 'rgba(88,28,135,0.60)'],
  biochemistry: ['rgba(8,145,178,0.40)', 'rgba(30,58,138,0.60)'],
  pharmacology: ['rgba(13,148,136,0.40)', 'rgba(22,78,99,0.60)'],
  pathology: ['rgba(124,58,237,0.40)', 'rgba(88,28,135,0.60)'],
  microbiology: ['rgba(5,150,105,0.40)', 'rgba(20,83,45,0.60)'],
};
const DEFAULT_GRADIENT: [string, string] = ['rgba(124,58,237,0.40)', 'rgba(88,28,135,0.60)'];

const WHATSAPP_LABEL: Record<YearKey, string> = {
  'first-year': '1st year',
  'second-year': '2nd year',
  'third-year': '3rd year',
  'final-year': 'Final year',
};

export default function HomeScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const countDone = useCountDone();

  const [slide, setSlide] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  useEffect(() => {
    readFocusMinutes().then(setFocusMinutes);
  }, []);

  const reduceMotion = useReducedMotion();
  const heroFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // A 6-second loop is a ~0.17 Hz oscillation, which is exactly the kind of
    // slow repeating motion reduced-motion users ask to be spared (SKILL §14).
    // The dots stay tappable, so nothing becomes unreachable — the carousel
    // simply stops driving itself.
    if (reduceMotion) {
      return;
    }
    const id = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // Cross-fade between slides. A hard cut mid-sentence reads as a glitch; the
  // fade is what tells you the text was replaced deliberately.
  useEffect(() => {
    if (reduceMotion) {
      heroFade.setValue(1);
      return;
    }
    heroFade.setValue(0);
    Animated.timing(heroFade, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [slide, heroFade, reduceMotion]);

  const { yearKey: year, streak, setYear } = useProfile();

  const subjects = useMemo(
    () =>
      getSubjects(year).map(subject => {
        const all = collectAllQuestions(subject.node);
        const done = countDone(all);
        return {
          ...subject,
          pct: all.length ? Math.round((done / all.length) * 100) : 0,
          icon: SUBJECT_ICON[subject.key] ?? '📘',
          gradient: SUBJECT_GRADIENT[subject.key] ?? DEFAULT_GRADIENT,
        };
      }),
    [year, countDone],
  );

  const goToTab = useCallback(
    (tab: keyof RootTabParamList) => {
      navigation.getParent<BottomTabNavigationProp<RootTabParamList>>()?.navigate(tab);
    },
    [navigation],
  );

  const openSubject = useCallback(
    (key: string, name: string) => {
      navigation.navigate('BrowseNode', { year, path: [key], title: name });
    },
    [navigation, year],
  );

  const pickYear = useCallback(
    (next: YearKey) => {
      setYear(KEY_TO_YEAR[next]);
      setYearPickerOpen(false);
    },
    [setYear],
  );

  const hero = HERO_SLIDES[slide];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconButton}>
            <Menu size={20} color={colors.text} />
          </View>
          <View>
            <Text style={[styles.brand, { color: colors.text }]}>ORBIT</Text>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              Learn. Retain. Master.
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <RoundButton label="FONT SIZE">
            <Type size={16} color={colors.text} />
          </RoundButton>
          <Touchable
            onPress={toggleTheme}
            label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            scaleTo={0.9}>
            <RoundButton label="THEME">
              {theme === 'dark' ? (
                <Moon size={16} color={colors.text} />
              ) : (
                <Sun size={16} color={colors.text} />
              )}
            </RoundButton>
          </Touchable>
        </View>
      </View>

      {/* Hero card */}
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.card, borderColor: withAlpha(colors.primary, 0.2) },
        ]}>
        <View
          style={[styles.heroGlow, { backgroundColor: withAlpha(colors.fuchsia, 0.12) }]}
          pointerEvents="none"
        />
        <Text style={[styles.heroKicker, { color: colors.textMuted }]}>Welcome to</Text>
        <Animated.View style={{ opacity: heroFade }}>
          <Text
            accessibilityRole="header"
            style={[styles.heroTitle, { color: colors.fuchsia }]}>
            {hero.title}
          </Text>
          <Text style={[styles.heroBody, { color: colors.textMuted }]}>{hero.body}</Text>
        </Animated.View>

        <View style={[styles.credit, { borderColor: colors.border }]}>
          <View>
            <Text style={[styles.creditLabel, { color: colors.textMuted }]}>CREATED BY</Text>
            <Text style={[styles.creditName, { color: colors.text }]}>Sabharivarshan S</Text>
          </View>
          <Flag size={16} color={colors.textMuted} />
        </View>

        {/* Tappable, so the carousel is something the reader controls rather
            than something that happens to them (SKILL §16 Agency). */}
        <View style={styles.dots}>
          {HERO_SLIDES.map((item, index) => (
            <Touchable
              key={item.title}
              onPress={() => setSlide(index)}
              label={item.title}
              role="tab"
              state={{ selected: index === slide }}
              hitSlop={12}
              scale={false}>
              <View
                style={[
                  styles.dot,
                  index === slide
                    ? { width: 20, backgroundColor: colors.primary }
                    : { width: 6, backgroundColor: colors.cardElevated },
                ]}
              />
            </Touchable>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction
          icon={<TrendingUp size={20} color={colors.primary} />}
          label="Progress"
          sub="Track your learning"
          color={colors.primary}
          onPress={() => goToTab('Progress')}
        />
        <QuickAction
          icon={<Search size={20} color={colors.cyan} />}
          label="Search"
          sub="Find topics instantly"
          color={colors.cyan}
          onPress={() => navigation.navigate('BrowseHome', { focusSearch: true })}
        />
        <QuickAction
          icon={<TimerIcon size={20} color={colors.emerald} />}
          label="Timer"
          sub="Focus with Pomodoro"
          color={colors.emerald}
          onPress={() => goToTab('Timer')}
        />
        <QuickAction
          icon={<Sparkles size={20} color={colors.fuchsia} />}
          label="Ask AI"
          sub="Get instant help"
          color={colors.fuchsia}
          onPress={() => goToTab('AskAI')}
        />
      </View>

      {/* WhatsApp community */}
      <Touchable
        onPress={() => Linking.openURL('https://chat.whatsapp.com/').catch(() => {})}
        label="Join our WhatsApp community"
        hint="Opens WhatsApp"
        scaleTo={0.985}
        style={[
          styles.whatsapp,
          {
            borderColor: withAlpha(colors.green, 0.3),
            backgroundColor: withAlpha(colors.green, 0.05),
          },
        ]}>
        <View style={[styles.whatsappIcon, { backgroundColor: withAlpha(colors.green, 0.15) }]}>
          <MessageCircle size={16} color={colors.green} />
        </View>
        <View style={styles.whatsappBody}>
          <Text style={[styles.whatsappTitle, { color: colors.text }]}>
            Join our WhatsApp community
          </Text>
          <Text style={[styles.whatsappSub, { color: colors.textMuted }]}>
            {WHATSAPP_LABEL[year]} materials, notes & updates
          </Text>
        </View>
        <Text style={[styles.whatsappJoin, { color: colors.green }]}>Join</Text>
      </Touchable>

      {/* Your Subjects */}
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
          Your Subjects
        </Text>
        <Touchable
          onPress={() => setYearPickerOpen(open => !open)}
          label="View all years"
          hint="Opens the year picker"
          state={{ expanded: yearPickerOpen }}
          style={styles.viewAll}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Touchable>
      </View>

      <YearPickerSheet
        visible={yearPickerOpen}
        currentYear={year}
        onClose={() => setYearPickerOpen(false)}
        onBrowse={(key, makeDefault) => {
          if (makeDefault) {
            pickYear(key);
          }
          setYearPickerOpen(false);
          navigation.navigate('BrowseHome', { year: key });
        }}
      />

      <View style={styles.subjectGrid}>
        {subjects.map(subject => (
          <Touchable
            key={subject.key}
            onPress={() => openSubject(subject.key, subject.name)}
            // One spoken sentence beats four fragments; TalkBack reads the
            // card as a whole, not as name / bar / percent / arrow.
            label={`${subject.name}, ${subject.pct}% complete`}
            scaleTo={0.975}
            style={[styles.subjectCard, { borderColor: colors.border }]}>
            <GradientFill
              from={subject.gradient[0]}
              to={subject.gradient[1]}
              borderRadius={16}
            />
            <Text style={styles.subjectEmoji}>{subject.icon}</Text>
            <View style={styles.subjectFooter}>
              <Text style={[styles.subjectName, { color: colors.text }]}>
                {subject.name.toUpperCase()}
              </Text>
              <View style={[styles.subjectTrack, { backgroundColor: withAlpha('#000000', 0.4) }]}>
                <SubjectFill pct={subject.pct} color={colors.primary} />
              </View>
              <View style={styles.subjectMeta}>
                <Text style={[styles.subjectPct, { color: colors.primary }]}>
                  {subject.pct}% Complete
                </Text>
                <View
                  style={[styles.subjectArrow, { backgroundColor: withAlpha('#000000', 0.4) }]}>
                  <ArrowRight size={12} color={colors.text} />
                </View>
              </View>
            </View>
          </Touchable>
        ))}
      </View>

      {/* Stats */}
      <View style={[styles.stats, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
            <Flame size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Study Streak</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {streak}
              <Text style={[styles.statUnit, { color: colors.textMuted }]}> days 🔥</Text>
            </Text>
          </View>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
            <Trophy size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Study Time</Text>
            <Text style={[styles.statValueSmall, { color: colors.text }]}>
              {formatFocusTime(focusMinutes)}
            </Text>
            <Text style={[styles.statHint, { color: colors.primary }]}>Keep going!</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** "Select Year" bottom sheet, opened from "View all". */
function YearPickerSheet({
  visible,
  currentYear,
  onClose,
  onBrowse,
}: {
  visible: boolean;
  currentYear: YearKey;
  onClose: () => void;
  onBrowse: (year: YearKey, makeDefault: boolean) => void;
}) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<YearKey>(currentYear);
  const [makeDefault, setMakeDefault] = useState(false);

  // Reopening always starts from the user's current year.
  useEffect(() => {
    if (visible) {
      setPicked(currentYear);
      setMakeDefault(false);
    }
  }, [visible, currentYear]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Select Year">
      <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
        Choose the year you want to browse
      </Text>

      <View style={styles.sheetGrid}>
        {YEAR_KEYS.map(key => {
          const active = key === picked;
          const isDefault = key === currentYear;
          return (
            <Touchable
              key={key}
              onPress={() => setPicked(key)}
              role="radio"
              label={isDefault ? `${YEAR_LABEL[key]}, current default` : YEAR_LABEL[key]}
              state={{ checked: active }}
              scaleTo={0.97}
              style={[
                styles.sheetYear,
                {
                  backgroundColor: colors.cardElevated,
                  borderColor: active ? colors.text : colors.border,
                  borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}>
              <Text style={[styles.sheetYearName, { color: colors.text }]}>
                {YEAR_LABEL[key]}
              </Text>
              {isDefault ? (
                <Text style={[styles.sheetYearHint, { color: colors.textMuted }]}>
                  Current default
                </Text>
              ) : null}
            </Touchable>
          );
        })}
      </View>

      <Touchable
        style={styles.checkRow}
        onPress={() => setMakeDefault(v => !v)}
        role="checkbox"
        label="Set as my default year"
        state={{ checked: makeDefault }}
        scale={false}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: makeDefault ? colors.primary : colors.border,
              backgroundColor: makeDefault ? colors.primary : 'transparent',
            },
          ]}>
          {makeDefault ? <Check size={14} color={colors.primaryText} strokeWidth={3} /> : null}
        </View>
        <Text style={[styles.checkLabel, { color: colors.text }]}>Set as my default year</Text>
      </Touchable>

      <Touchable
        onPress={() => onBrowse(picked, makeDefault)}
        label={`Browse ${YEAR_LABEL[picked]}`}
        style={styles.browseButton}>
        <GradientFill from="#FFFFFF" to={colors.fuchsia} borderRadius={14} />
        <Text style={styles.browseText}>Browse {YEAR_LABEL[picked]}</Text>
      </Touchable>
    </Sheet>
  );
}

function RoundButton({ children, label }: { children: React.ReactNode; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.roundButtonWrap}>
      <Text style={[styles.roundButtonLabel, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.roundButton,
          { backgroundColor: colors.cardElevated, borderColor: colors.border },
        ]}>
        {children}
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  sub,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Touchable
      onPress={onPress}
      label={label}
      hint={sub}
      style={[
        styles.quickAction,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}>
      {icon}
      <View>
        <Text style={[styles.quickLabel, { color }]}>{label}</Text>
        <Text style={[styles.quickSub, { color: colors.textMuted }]} numberOfLines={2}>
          {sub}
        </Text>
        <ArrowRight size={12} color={color} style={styles.quickArrow} />
      </View>
    </Touchable>
  );
}

/**
 * The completion bar on a subject card. Split out so only this sliver
 * re-renders when a question is ticked, rather than the whole grid.
 *
 * Squeezed with scaleX from the left edge rather than having its width
 * animated: width is a layout property and would force layout+paint every
 * frame, for every card in the grid, on the JS thread. See ui.tsx ProgressBar.
 */
const SubjectFill = React.memo(function SubjectFillBar({
  pct,
  color,
}: {
  pct: number;
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(pct / 100)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current || reduceMotion) {
      firstRun.current = false;
      scale.setValue(pct / 100);
      return;
    }
    Animated.timing(scale, {
      toValue: pct / 100,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [pct, reduceMotion, scale]);

  return (
    <Animated.View
      style={[
        styles.subjectFill,
        {
          backgroundColor: color,
          transformOrigin: 'left',
          transform: [{ scaleX: scale }],
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 10,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  roundButtonWrap: {
    alignItems: 'center',
    gap: 3,
  },
  roundButtonLabel: {
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: '600',
  },
  roundButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    height: 160,
    width: 160,
    borderRadius: 80,
  },
  heroKicker: {
    fontSize: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  credit: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  creditLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  creditName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    justifyContent: 'space-between',
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickSub: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  quickArrow: {
    marginTop: 4,
  },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  whatsappIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBody: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  whatsappSub: {
    fontSize: 11,
    marginTop: 2,
  },
  whatsappJoin: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 14,
    marginTop: 2,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sheetYear: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 72,
    justifyContent: 'center',
  },
  sheetYearName: {
    fontSize: 17,
    fontWeight: '700',
  },
  sheetYearHint: {
    fontSize: 13,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  checkbox: {
    height: 24,
    width: 24,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    fontSize: 16,
  },
  browseButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 18,
  },
  browseText: {
    color: '#1A0A1F',
    fontSize: 17,
    fontWeight: '800',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectCard: {
    // Strict two-column grid, matching `grid-cols-2` on the web. An odd last
    // card stays half-width instead of stretching.
    width: '48%',
    height: 160,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  subjectEmoji: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 34,
    opacity: 0.8,
  },
  subjectFooter: {
    zIndex: 1,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  subjectFill: {
    height: '100%',
    // Full width in layout; scaleX does the work.
    width: '100%',
    borderRadius: 2,
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subjectPct: {
    fontSize: 11,
    fontWeight: '500',
  },
  subjectArrow: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 20,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  statIcon: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  statHint: {
    fontSize: 10,
    marginTop: 1,
  },
});
