import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ChevronRight, Search } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card, EmptyState, Muted, ProgressBar } from '@/components/ui';
import { BackButton } from '@/components/BackButton';
import { LIST_TUNING } from '@/components/listTuning';
import {
  collectAllQuestions,
  getSubjects,
  searchQuestions,
  warmSearchIndex,
  SUBJECT_ICON,
  YEAR_KEYS,
  YEAR_LABEL,
  YearKey,
} from '@/lib/questionBank';
import { useCountDone } from '@/hooks/useProgress';
import { useProfile } from '@/hooks/useProfile';
import { QuestionRow } from '@/components/QuestionRow';
import type { HomeStackParamList, RootTabParamList } from '@/navigation/types';
import { SegmentedControl } from '@/components/ui';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'BrowseHome'>;
type Route = RouteProp<HomeStackParamList, 'BrowseHome'>;

const SEARCH_DEBOUNCE_MS = 220;

export default function BrowseHomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const countDone = useCountDone();

  const { yearKey: profileYear } = useProfile();
  const [year, setYear] = useState<YearKey>(route.params?.year ?? profileYear);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Follow the profile's year until the user picks one on this screen.
  useEffect(() => {
    if (!route.params?.year) {
      setYear(profileYear);
    }
  }, [route.params?.year, profileYear]);

  // Build the search index while the user is still reading the screen, so the
  // first keystroke does not pay for it.
  useEffect(() => {
    warmSearchIndex();
  }, []);

  // The bank is large; debounce so the walk does not run on every keystroke.
  useEffect(() => {
    if (query === debounced) {
      return;
    }
    const id = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, debounced]);

  const results = useMemo(() => searchQuestions(debounced), [debounced]);
  const isSearching = debounced.trim().length >= 2;

  const subjects = useMemo(() => {
    return getSubjects(year).map(subject => {
      const all = collectAllQuestions(subject.node);
      return { ...subject, total: all.length, done: countDone(all) };
    });
  }, [year, countDone]);

  const askAi = useCallback(
    (question: string) => {
      navigation
        .getParent<BottomTabNavigationProp<RootTabParamList>>()
        ?.navigate('AskAI', { question, nonce: Date.now() });
    },
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Question Bank
        </Text>
      </View>

      <View
        style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search all questions…"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
          returnKeyType="search"
          autoFocus={route.params?.focusSearch}
        />
      </View>

      {isSearching ? (
        <FlatList
          {...LIST_TUNING}
          data={results}
          keyExtractor={(item, index) => `${item.subjectKey}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Muted style={styles.resultCount}>
              {results.length === 0
                ? 'No matches'
                : `${results.length} match${results.length === 1 ? '' : 'es'}`}
            </Muted>
          }
          ListEmptyComponent={
            <EmptyState
              title="Nothing found"
              subtitle="Try a shorter phrase, like a drug or disease name."
            />
          }
          renderItem={({ item, index }) => (
            <View>
              <Text style={[styles.hitPath, { color: colors.textMuted }]}>
                {item.yearLabel} · {item.subjectName} ·{' '}
                {item.type === 'essay' ? 'Essay' : 'Short Notes'}
              </Text>
              <QuestionRow question={item.question} index={index} onAskAi={askAi} />
            </View>
          )}
        />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.yearSelector}>
              <SegmentedControl
                options={YEAR_KEYS.map(key => ({ key, label: YEAR_LABEL[key].replace(' Year', '') }))}
                value={year}
                onChange={setYear}
              />
            </View>
          }
          renderItem={({ item }) => (
            <Card
              style={styles.subjectCard}
              label={`${item.name}, ${item.done} of ${item.total} done`}
              onPress={() =>
                navigation.navigate('BrowseNode', {
                  year,
                  path: [item.key],
                  title: item.name,
                })
              }>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectIcon}>{SUBJECT_ICON[item.key] ?? '📘'}</Text>
                <View style={styles.subjectBody}>
                  <Text style={[styles.subjectName, { color: colors.text }]}>{item.name}</Text>
                  <Muted>
                    {item.done} of {item.total} done
                  </Muted>
                  <View style={styles.subjectProgress}>
                    <ProgressBar value={item.done} total={item.total} />
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  backButton: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  yearSelector: {
    marginBottom: 14,
  },
  resultCount: {
    marginBottom: 10,
  },
  hitPath: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  subjectCard: {
    marginBottom: 10,
    paddingVertical: 14,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectIcon: {
    fontSize: 24,
  },
  subjectBody: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subjectProgress: {
    marginTop: 8,
  },
});
