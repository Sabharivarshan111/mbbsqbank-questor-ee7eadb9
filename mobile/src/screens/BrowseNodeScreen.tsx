import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card, EmptyState, Muted, ProgressBar, SegmentedControl } from '@/components/ui';
import { QuestionRow } from '@/components/QuestionRow';
import {
  collectQuestions,
  findTypeQuestions,
  getTopicChildren,
  QuestionType,
  resolveNode,
} from '@/lib/questionBank';
import { useCountDone } from '@/hooks/useProgress';
import type { HomeStackParamList, RootTabParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'BrowseNode'>;
type Route = RouteProp<HomeStackParamList, 'BrowseNode'>;

const TYPE_OPTIONS: { key: QuestionType; label: string }[] = [
  { key: 'essay', label: 'Essays' },
  { key: 'short-notes', label: 'Short Notes' },
];

/**
 * One screen for every level of the bank. Subjects, papers and topics all have
 * the same shape — children plus optional essay / short-note buckets — so the
 * screen renders whichever the current node actually has and pushes itself
 * again for children.
 */
export default function BrowseNodeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const countDone = useCountDone();
  const { year, path, title } = route.params;

  const [type, setType] = useState<QuestionType>('essay');

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const node = useMemo(() => resolveNode(year, path), [year, path]);
  const children = useMemo(() => getTopicChildren(node), [node]);
  const questions = useMemo(() => findTypeQuestions(node, type), [node, type]);

  const childStats = useMemo(
    () =>
      children.map(child => {
        const all = collectQuestions(child.node, type);
        return { ...child, total: all.length, done: countDone(all) };
      }),
    [children, type, countDone],
  );

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

  const doneHere = useMemo(() => countDone(questions), [questions, countDone]);

  const header = (
    <View style={styles.header}>
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
      {questions.length > 0 ? (
        <View style={styles.headerStats}>
          <Muted>
            {doneHere} of {questions.length} done
          </Muted>
          <View style={styles.headerProgress}>
            <ProgressBar value={doneHere} total={questions.length} />
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!node) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState title="Topic not found" />
      </View>
    );
  }

  // Leaf level: this node holds the questions themselves.
  if (children.length === 0) {
    return (
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.listContent}
        data={questions}
        keyExtractor={(item, index) => `${index}-${item.slice(0, 24)}`}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            title={`No ${type === 'essay' ? 'essays' : 'short notes'} here`}
            subtitle="Switch the tab above to see the other question type."
          />
        }
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <QuestionRow question={item} index={index} onAskAi={askAi} />
        )}
      />
    );
  }

  // Branch level: list child topics, and any questions attached directly here.
  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.listContent}
      data={childStats}
      keyExtractor={item => item.key}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <Card style={styles.topicCard} onPress={() => openChild(item.key, item.name)}>
          <View style={styles.topicRow}>
            <View style={styles.topicBody}>
              <Text style={[styles.topicName, { color: colors.text }]}>{item.name}</Text>
              <Muted>
                {item.done} / {item.total} {type === 'essay' ? 'essays' : 'short notes'}
              </Muted>
              <View style={styles.topicProgress}>
                <ProgressBar value={item.done} total={item.total} />
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </Card>
      )}
      ListFooterComponent={
        questions.length > 0 ? (
          <View style={styles.footer}>
            <Text style={[styles.footerTitle, { color: colors.text }]}>
              Questions in {title}
            </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 14,
  },
  headerStats: {
    marginTop: 12,
  },
  headerProgress: {
    marginTop: 6,
  },
  topicCard: {
    marginBottom: 10,
    paddingVertical: 14,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicBody: {
    flex: 1,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  topicProgress: {
    marginTop: 8,
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
