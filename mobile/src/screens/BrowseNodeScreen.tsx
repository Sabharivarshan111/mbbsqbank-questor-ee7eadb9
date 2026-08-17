import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react-native';
import { typeScale } from '@/theme/typography';
import { useTheme } from '@/theme';
import { LIST_TUNING } from '@/components/listTuning';
import { Touchable } from '@/components/Touchable';
import { EmptyState, Muted, SegmentedControl } from '@/components/ui';
import { GradientText } from '@/components/GradientText';
import { ThinBar } from '@/components/ProgressRing';
import { QuestionRow } from '@/components/QuestionRow';
import {
  collectAllQuestions,
  collectQuestions,
  findTypeQuestions,
  getTopicChildren,
  SUBJECT_ICON,
  type QuestionType,
  resolveNode,
} from '@/lib/questionBank';
import { useCountDone } from '@/hooks/useProgress';
import { requestDailyAd } from '@/lib/dailyAd';
import type { HomeStackParamList, RootTabParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'BrowseNode'>;
type Route = RouteProp<HomeStackParamList, 'BrowseNode'>;

/** "01", "02", … as shown in the numbered badges. */
function ordinal(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * Every level of the question bank uses this screen. It renders one of three
 * layouts depending on what the node actually holds:
 *
 *  - papers   → a subject whose children are Paper 1 / Paper 2
 *  - topics   → a numbered topic list with per-topic progress
 *  - questions → the leaf list itself
 */
export default function BrowseNodeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const countDone = useCountDone();
  const { year, path, title } = route.params;

  const [type, setType] = useState<QuestionType>('essay');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Opening a leaf topic is the "questions" bucket's trigger.
  const isLeaf = getTopicChildren(resolveNode(year, path)).length === 0;
  useEffect(() => {
    if (isLeaf) {
      requestDailyAd('questions').catch(() => undefined);
    }
  }, [isLeaf]);

  const node = useMemo(() => resolveNode(year, path), [year, path]);
  const children = useMemo(() => getTopicChildren(node), [node]);
  const questions = useMemo(() => findTypeQuestions(node, type), [node, type]);
  const essayCount = useMemo(() => findTypeQuestions(node, 'essay').length, [node]);
  const shortNoteCount = useMemo(() => findTypeQuestions(node, 'short-notes').length, [node]);

  // A subject page listing exam papers looks different from a topic list.
  const isPaperLevel =
    path.length === 1 && children.length > 0 && children.every(c => /^paper-\d+$/.test(c.key));

  const askAi = useCallback(
    (question: string) => {
      navigation
        .getParent<BottomTabNavigationProp<RootTabParamList>>()
        ?.navigate('AskAI', { question, nonce: Date.now() });
    },
    [navigation],
  );

  const openChild = useCallback(
    (key: string, name: string) => {
      navigation.push('BrowseNode', { year, path: [...path, key], title: name });
    },
    [navigation, year, path],
  );

  const back = useCallback(() => navigation.goBack(), [navigation]);

  const backControl = (
    <Touchable
      onPress={back}
      label="Back"
      hitSlop={12}
      scaleTo={0.88}
      style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ArrowLeft size={20} color={colors.text} />
    </Touchable>
  );

  if (!node) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState title="Topic not found" />
      </View>
    );
  }

  // ---- Paper selection -----------------------------------------------------
  if (isPaperLevel) {
    return (
      <FlatList
        {...LIST_TUNING}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
        data={children}
        keyExtractor={item => item.key}
        ListHeaderComponent={
          <View style={styles.paperHeader}>
            <View style={styles.headerRow}>
              {backControl}
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}>
                <Text style={styles.avatarEmoji}>{SUBJECT_ICON[path[0]] ?? '📘'}</Text>
              </View>
              <View style={styles.backSpacer} />
            </View>
            <GradientText size={24} letterSpacing={1}>
              {title.toUpperCase()}
            </GradientText>
            <Text style={[styles.kicker, { color: colors.textMuted }]}>
              SELECT EXAMINATION PAPER
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const topics = getTopicChildren(item.node);
          return (
            <View
              style={[styles.paperCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Touchable
                onPress={() => openChild(item.key, item.name)}
                label={item.name}
                scale={false}
                dim
                style={styles.paperTop}>
                <View style={[styles.badge, { borderColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>{ordinal(index)}</Text>
                </View>
                <View style={styles.paperTitleWrap}>
                  <Text style={[styles.paperTitle, { color: colors.text }]}>{item.name}</Text>
                  <View style={[styles.titleRule, { backgroundColor: colors.text }]} />
                </View>
                <ChevronRight size={22} color={colors.textMuted} />
              </Touchable>

              {topics.length > 0 ? (
                <Text style={[styles.paperTopics, { color: colors.textMuted }]}>
                  {topics.map(t => t.name.toUpperCase()).join('  •  ')}
                </Text>
              ) : null}

              <Touchable
                onPress={() => openChild(item.key, item.name)}
                label={`Explore ${item.name} questions`}
                scale={false}
                dim
                style={[styles.exploreRow, { borderTopColor: colors.border }]}>
                <Search size={18} color={colors.text} />
                <Text style={[styles.exploreText, { color: colors.text }]}>Explore Questions</Text>
                <ChevronRight size={20} color={colors.textMuted} />
              </Touchable>
            </View>
          );
        }}
      />
    );
  }

  // ---- Topic list ----------------------------------------------------------
  if (children.length > 0) {
    return (
      <FlatList
        {...LIST_TUNING}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
        data={children}
        keyExtractor={item => item.key}
        ListHeaderComponent={
          <View style={styles.topicHeader}>
            <View style={styles.headerRow}>
              {backControl}
              <View style={styles.topicTitleWrap}>
                <Text style={[styles.kicker, { color: colors.textMuted }]}>
                  {children.length} TOPICS
                </Text>
                <GradientText size={24}>{title}</GradientText>
              </View>
              <View style={styles.backSpacer} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const all = collectAllQuestions(item.node);
          const done = countDone(all);
          const pct = all.length ? (done / all.length) * 100 : 0;
          return (
            <Touchable
              onPress={() => openChild(item.key, item.name)}
              label={`${item.name}, ${done} of ${all.length} questions done`}
              scaleTo={0.985}
              style={[
                styles.topicCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}>
              <View style={[styles.badge, { borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>{ordinal(index)}</Text>
              </View>
              <View style={styles.topicBody}>
                <Text style={[styles.topicName, { color: colors.text }]}>{item.name}</Text>
                <View style={styles.topicBar}>
                  <ThinBar percent={pct} />
                </View>
                <Text style={[styles.topicCount, { color: colors.textMuted }]}>
                  {done}/{all.length} questions
                </Text>
              </View>
              <ChevronRight size={22} color={colors.textMuted} />
            </Touchable>
          );
        }}
        ListFooterComponent={
          questions.length > 0 ? (
            <View style={styles.footer}>
              <Text style={[styles.footerTitle, { color: colors.text }]}>Questions in {title}</Text>
              {questions.map((question, index) => (
                <QuestionRow
                  key={`${index}-${question.slice(0, 24)}`}
                  question={question}
                  index={index}
                  onAskAi={askAi}
                />
              ))}
            </View>
          ) : undefined
        }
      />
    );
  }

  // ---- Questions -----------------------------------------------------------
  const doneHere = countDone(questions);
  return (
    <FlatList
      {...LIST_TUNING}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
      data={questions}
      keyExtractor={(item, index) => `${index}-${item.slice(0, 24)}`}
      initialNumToRender={12}
      windowSize={10}
      removeClippedSubviews
      ListHeaderComponent={
        <View style={styles.questionHeader}>
          <View style={styles.headerRow}>
            {backControl}
            <View style={styles.topicTitleWrap}>
              <Text style={[styles.kicker, { color: colors.textMuted }]}>
                {collectQuestions(node, type).length} QUESTIONS
              </Text>
              <GradientText size={22}>{title}</GradientText>
            </View>
            <View style={styles.backSpacer} />
          </View>
          {/* Counts on the tabs, as the published app shows them: you can see
              a topic has no essays before tapping into an empty list. */}
          <SegmentedControl
            options={[
              { key: 'essay' as const, label: `Essays  ${essayCount}` },
              { key: 'short-notes' as const, label: `Short Notes  ${shortNoteCount}` },
            ]}
            value={type}
            onChange={setType}
          />
          {questions.length > 0 ? (
            <View style={styles.questionStats}>
              <Muted>
                {doneHere} of {questions.length} done
              </Muted>
              <View style={styles.questionBar}>
                <ThinBar percent={questions.length ? (doneHere / questions.length) * 100 : 0} />
              </View>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title={`No ${type === 'essay' ? 'essays' : 'short notes'} here`}
          subtitle="Switch the tab above to see the other question type."
        />
      }
      renderItem={({ item, index }) => (
        <QuestionRow question={item} index={index} onAskAi={askAi} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 44,
  },
  avatar: {
    height: 76,
    width: 76,
    borderRadius: 38,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 34,
  },
  paperHeader: {
    marginBottom: 20,
  },
  topicHeader: {
    marginBottom: 16,
  },
  topicTitleWrap: {
    flex: 1,
  },
  questionHeader: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  paperCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  paperTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  badge: {
    height: 58,
    width: 58,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  paperTitleWrap: {
    flex: 1,
  },
  paperTitle: {
    ...typeScale.title2,
    fontSize: 20,
    fontWeight: '700',
  },
  titleRule: {
    height: 3,
    width: 34,
    borderRadius: 2,
    marginTop: 6,
  },
  paperTopics: {
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.3,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exploreText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  topicBody: {
    flex: 1,
  },
  topicName: {
    fontSize: 17,
    fontWeight: '700',
  },
  topicBar: {
    marginTop: 8,
    marginRight: 24,
  },
  topicCount: {
    fontSize: 13,
    marginTop: 8,
  },
  questionStats: {
    marginTop: 12,
  },
  questionBar: {
    marginTop: 6,
  },
  footer: {
    marginTop: 18,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});
