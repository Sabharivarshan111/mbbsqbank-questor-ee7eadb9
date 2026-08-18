import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  MessageCircle,
  RotateCw,
  Sparkles,
  TriangleAlert,
  Wand2,
} from 'lucide-react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { ProgressBar } from '@/components/ui';
import { typeScale } from '@/theme/typography';
import { useTheme, withAlpha } from '@/theme';
import { GradientFill } from '@/components/Gradient';
import { NotesContentView } from '@/components/NotesContentView';
import { useProfile } from '@/hooks/useProfile';
import { getSubjects, YEAR_LABEL, type BankNode, type YearKey } from '@/lib/questionBank';
import { YEAR_TO_KEY, type Year } from '@/lib/profile';
import {
  applyNotesEdit,
  fetchNotesBatch,
  flattenSubjectTopics,
  INTER_BATCH_DELAY_MS,
  mergeNotes,
  saveMergedNotes,
  type LeafTopic,
  type NotesContent,
} from '@/lib/handwrittenNotes';

const YEARS: Year[] = ['first', 'second', 'third', 'final'];
const YEAR_EMOJI: Record<Year, string> = {
  first: '🩺',
  second: '💊',
  third: '⚖️',
  final: '🏥',
};

type View_ =
  | { kind: 'years' }
  | { kind: 'subjects'; year: Year }
  | { kind: 'topics'; year: Year; subjectKey: string; subjectName: string; node: BankNode }
  | { kind: 'notes'; year: Year; subject: string; topic: LeafTopic };

/** Port of src/components/handwritten/HandwrittenNotesHub.tsx. */
export default function NotesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { year: profileYear } = useProfile();
  const [view, setView] = useState<View_>({ kind: 'years' });

  const topicsViewFor = useCallback((current: Extract<View_, { kind: 'notes' }>): View_ => {
    const subjectKey = current.topic.key.split('::')[0];
    const subject = getSubjects(YEAR_TO_KEY[current.year]).find(s => s.key === subjectKey);
    return {
      kind: 'topics',
      year: current.year,
      subjectKey,
      subjectName: current.subject,
      node: subject?.node ?? {},
    };
  }, []);

  // Hardware back steps up one level before leaving the tab. Android only —
  // BackHandler is a no-op elsewhere and warns in the web preview.
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view.kind === 'years') {
        return false;
      }
      setView(current => {
        if (current.kind === 'subjects') {
          return { kind: 'years' };
        }
        if (current.kind === 'topics') {
          return { kind: 'subjects', year: current.year };
        }
        if (current.kind === 'notes') {
          return topicsViewFor(current);
        }
        return current;
      });
      return true;
    });
    return () => sub.remove();
  }, [view.kind, topicsViewFor]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
      {view.kind === 'years' ? (
        <YearsView currentYear={profileYear} onPick={year => setView({ kind: 'subjects', year })} />
      ) : null}

      {view.kind === 'subjects' ? (
        <SubjectsView
          year={view.year}
          onBack={() => setView({ kind: 'years' })}
          onPick={(subjectKey, subjectName, node) =>
            setView({ kind: 'topics', year: view.year, subjectKey, subjectName, node })
          }
        />
      ) : null}

      {view.kind === 'topics' ? (
        <TopicsView
          year={view.year}
          subjectKey={view.subjectKey}
          subjectName={view.subjectName}
          node={view.node}
          onBack={() => setView({ kind: 'subjects', year: view.year })}
          onPick={topic =>
            setView({ kind: 'notes', year: view.year, subject: view.subjectName, topic })
          }
        />
      ) : null}

      {view.kind === 'notes' ? (
        <NotesDetailView
          year={view.year}
          subject={view.subject}
          topic={view.topic}
          onBack={() => setView(topicsViewFor(view))}
        />
      ) : null}
    </ScrollView>
  );
}

function BackHeader({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.backHeader}>
      <Touchable
        onPress={onBack}
        label="Back"
        hitSlop={12}
        scaleTo={0.88}
        style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ArrowLeft size={20} color={colors.text} />
      </Touchable>
      <View style={styles.flex}>
        <Text style={[styles.backTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.backSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function YearsView({ currentYear, onPick }: { currentYear: Year; onPick: (year: Year) => void }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>Notes</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        AI-generated handwritten notes for every topic
      </Text>

      <View style={styles.hero}>
        <GradientFill from="#1E40AF" to="#3B82F6" borderRadius={18} />
        <View style={styles.heroKickerRow}>
          <Sparkles size={16} color="#FFFFFF" />
          <Text style={styles.heroKicker}>AI GENERATED</Text>
        </View>
        <Text style={styles.heroTitle}>Handwritten Notes</Text>
        <Text style={styles.heroBody}>
          Pick a year → subject → topic. We synthesize an exam-ready page from every essay &
          short-note in that topic.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT YEAR</Text>
      <View style={styles.yearGrid}>
        {YEARS.map(year => (
          <Touchable
            key={year}
            onPress={() => onPick(year)}
            label={`${YEAR_LABEL[YEAR_TO_KEY[year]]}, browse subjects`}
            state={{ selected: year === currentYear }}
            scaleTo={0.97}
            style={[
              styles.yearCard,
              {
                backgroundColor: colors.card,
                borderColor: year === currentYear ? colors.text : colors.border,
              },
            ]}>
            <Text style={styles.yearEmoji}>{YEAR_EMOJI[year]}</Text>
            <Text style={[styles.yearName, { color: colors.text }]}>
              {YEAR_LABEL[YEAR_TO_KEY[year]]}
            </Text>
            <Text style={[styles.yearHint, { color: colors.textMuted }]}>
              Tap to browse subjects
            </Text>
          </Touchable>
        ))}
      </View>

      <WhatsAppBlock year={YEAR_TO_KEY[currentYear]} />
    </>
  );
}

function SubjectsView({
  year,
  onBack,
  onPick,
}: {
  year: Year;
  onBack: () => void;
  onPick: (key: string, name: string, node: BankNode) => void;
}) {
  const { colors } = useTheme();
  const subjects = useMemo(() => getSubjects(YEAR_TO_KEY[year]), [year]);

  return (
    <>
      <BackHeader onBack={onBack} title={`${YEAR_LABEL[YEAR_TO_KEY[year]]} • Subjects`} />
      {subjects.map(subject => (
        <Touchable
          key={subject.key}
          onPress={() => onPick(subject.key, subject.name, subject.node)}
          label={`${subject.name}, see topics`}
          scaleTo={0.985}
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.fuchsia, 0.15) }]}>
            <GraduationCap size={20} color={colors.text} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{subject.name}</Text>
            <Text style={[styles.rowHint, { color: colors.textMuted }]}>Tap to see topics</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Touchable>
      ))}
    </>
  );
}

function TopicsView({
  year,
  subjectKey,
  subjectName,
  node,
  onBack,
  onPick,
}: {
  year: Year;
  subjectKey: string;
  subjectName: string;
  node: BankNode;
  onBack: () => void;
  onPick: (topic: LeafTopic) => void;
}) {
  const { colors } = useTheme();
  const topics = useMemo(() => flattenSubjectTopics(subjectKey, node), [subjectKey, node]);

  return (
    <>
      <BackHeader
        onBack={onBack}
        title={subjectName}
        subtitle={`${YEAR_LABEL[YEAR_TO_KEY[year]]} • ${topics.length} topics`}
      />
      {topics.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No topics with questions found.
        </Text>
      ) : null}
      {topics.map(topic => (
        <Touchable
          key={topic.key}
          onPress={() => onPick(topic)}
          label={`${topic.name}, ${topic.questions.length} questions`}
          scaleTo={0.985}
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{topic.name}</Text>
            <Text style={[styles.rowHint, { color: colors.textMuted }]} numberOfLines={1}>
              {topic.breadcrumb} • {topic.questions.length} questions
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Touchable>
      ))}
    </>
  );
}

type Phase = 'idle' | 'loading' | 'waiting' | 'done';

function NotesDetailView({
  year,
  subject,
  topic,
  onBack,
}: {
  year: Year;
  subject: string;
  topic: LeafTopic;
  onBack: () => void;
}) {
  const { colors } = useTheme();

  const [content, setContent] = useState<NotesContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [totalBatches, setTotalBatches] = useState(0);
  const [completedBatches, setCompletedBatches] = useState(0);
  const [waitSecs, setWaitSecs] = useState(0);
  const [instruction, setInstruction] = useState('');
  const [editing, setEditing] = useState(false);

  // Leaving the topic mid-generation must stop the batch loop.
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const request = useMemo(
    () => ({ topic, yearLabel: YEAR_LABEL[YEAR_TO_KEY[year]], subject }),
    [topic, year, subject],
  );

  const generate = useCallback(
    async (regenerate: boolean) => {
      setPhase('loading');
      setError(null);
      setContent(null);
      setCompletedBatches(0);
      const collected: (NotesContent | null)[] = [];

      try {
        let index = 0;
        let more = true;
        while (more && !cancelled.current) {
          const batch = await fetchNotesBatch(request, index, regenerate);
          collected[index] = batch.content;
          setTotalBatches(batch.totalBatches);
          setCompletedBatches(index + 1);
          // Show each batch as it lands rather than waiting for the whole set.
          setContent(mergeNotes(collected));
          more = batch.hasMore;
          index += 1;

          if (more && !batch.cached && !cancelled.current) {
            // The provider is rate-limited, so pace the next request.
            setPhase('waiting');
            const until = Date.now() + INTER_BATCH_DELAY_MS;
            while (Date.now() < until && !cancelled.current) {
              setWaitSecs(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
              // 1Hz: the countdown is shown to the second, so a 500ms tick was
              // paying for twice the renders with nothing visible in return.
              await new Promise<void>(resolve => setTimeout(resolve, 1000));
            }
            setPhase('loading');
          }
        }

        if (!cancelled.current) {
          const merged = mergeNotes(collected);
          setContent(merged);
          setPhase('done');
          if (collected.length > 1) {
            // Cache the merged page so the next open is a single call.
            saveMergedNotes(request, merged);
          }
        }
      } catch (err) {
        if (!cancelled.current) {
          setError(err instanceof Error ? err.message : 'Could not generate notes.');
          setPhase('idle');
        }
      }
    },
    [request],
  );

  useEffect(() => {
    generate(false);
  }, [generate]);

  const submitEdit = useCallback(async () => {
    const text = instruction.trim();
    if (!text || !content) {
      return;
    }
    setEditing(true);
    setError(null);
    try {
      const updated = await applyNotesEdit(request, content, text);
      setContent(updated);
      setInstruction('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the edit.');
    } finally {
      setEditing(false);
    }
  }, [instruction, content, request]);

  const busy = phase === 'loading' || phase === 'waiting';

  return (
    <>
      <BackHeader onBack={onBack} title={topic.name} subtitle={topic.breadcrumb} />

      {busy ? (
        <View style={[styles.status, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.fuchsia} />
          {/*
            * Two texts, because only one of them may be announced.
            *
            * Generating a big topic runs for minutes with 25-second pauses, so
            * a screen-reader user does need to be told the difference between
            * a long wait and a hang — that is the live region below. But this
            * label originally carried the ticking countdown inside the live
            * region, which made TalkBack read out "24s", "23s", "23s"… roughly
            * fifty times per batch, drowning the screen in speech. The number
            * is glanceable information; it is hidden from assistive tech and
            * only the phase is announced.
            */}
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.statusText, { color: colors.text }]}>
            {phase === 'waiting' ? 'Pacing the next batch' : 'Writing your notes…'}
          </Text>
          {phase === 'waiting' ? (
            <Text
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={[styles.statusSub, { color: colors.textMuted }]}>
              {waitSecs}s
            </Text>
          ) : null}
          {totalBatches > 1 ? (
            <>
              <Text style={[styles.statusSub, { color: colors.textMuted }]}>
                Batch {completedBatches} of {totalBatches}
              </Text>
              {/* "Batch 2 of 5" is a fact; a bar is a shape you can read at a
                  glance. On a wait this long that difference is the whole
                  point of showing status at all (SKILL §16 — expose ongoing
                  status). */}
              <View style={styles.statusBar}>
                <ProgressBar value={completedBatches} total={totalBatches} />
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {error ? (
        // An error the user can act on, not just a report. Failures announce
        // themselves so a screen-reader user is not left waiting on silence.
        <Touchable
          onPress={() => generate(false)}
          label={`${error} Tap to retry.`}
          scaleTo={0.985}
          style={[
            styles.status,
            {
              backgroundColor: withAlpha(colors.danger, 0.08),
              borderColor: withAlpha(colors.danger, 0.4),
            },
          ]}>
          <Text accessibilityLiveRegion="polite" style={[styles.statusText, { color: colors.text }]}>
            {error}
          </Text>
          <Text style={[styles.statusSub, { color: colors.fuchsia }]}>Tap to retry</Text>
        </Touchable>
      ) : null}

      {content ? <NotesContentView content={content} /> : null}

      {content && !busy ? (
        <>
          <View
            style={[styles.editBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.editHeader}>
              <Wand2 size={16} color={colors.fuchsia} />
              <Text style={[styles.editTitle, { color: colors.text }]}>Refine with AI</Text>
            </View>
            <TextInput
              value={instruction}
              onChangeText={setInstruction}
              placeholder="e.g. add a mnemonic for the stages"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.editInput,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            />
            <Touchable
              onPress={submitEdit}
              disabled={editing || instruction.trim().length === 0}
              state={{ busy: editing }}
              label="Apply refinement"
              hint="Rewrites the notes using your instruction"
              style={[styles.editButton, { backgroundColor: colors.primary }]}>
              {editing ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={[styles.editButtonText, { color: colors.primaryText }]}>Apply</Text>
              )}
            </Touchable>
          </View>

          <Touchable
            onPress={() => generate(true)}
            label="Regenerate notes"
            hint="Discards these notes and writes them again"
            style={[styles.regenerate, { borderColor: colors.border }]}>
            <RotateCw size={16} color={colors.textMuted} />
            <Text style={[styles.regenerateText, { color: colors.textMuted }]}>
              Regenerate notes
            </Text>
          </Touchable>
        </>
      ) : null}
    </>
  );
}

function WhatsAppBlock({ year }: { year: YearKey }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupIcon, { backgroundColor: withAlpha(colors.green, 0.15) }]}>
          <MessageCircle size={18} color={colors.green} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            WhatsApp group for {YEAR_LABEL[year].toLowerCase()}
          </Text>
          <Text style={[styles.groupSub, { color: colors.textMuted }]}>
            Join our WhatsApp group for {YEAR_LABEL[year].toLowerCase()} study materials, notes and
            exam updates.
          </Text>
        </View>
      </View>

      <Touchable
        onPress={() => Linking.openURL('https://chat.whatsapp.com/').catch(() => {})}
        label="Join our WhatsApp group"
        hint="Opens WhatsApp"
        style={styles.joinButton}>
        <GradientFill from="#22C55E" to="#16A34A" borderRadius={12} />
        <Text style={styles.joinText}>Tap here to join our WhatsApp group</Text>
      </Touchable>

      <View
        style={[
          styles.warning,
          {
            backgroundColor: withAlpha(colors.warning, 0.08),
            borderColor: withAlpha(colors.warning, 0.4),
          },
        ]}>
        <TriangleAlert size={16} color={colors.warning} />
        <Text style={[styles.warningText, { color: colors.warning }]}>
          You must be using the ORBIT MBBS app downloaded from the Play Store, on the latest
          version, to join. Search "Orbit MBBS" on the Play Store and install or update it. Older
          or illegitimate versions will not be allowed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  flex: {
    flex: 1,
  },
  title: typeScale.title1,
  subtitle: {
    fontSize: 15,
    marginTop: 2,
    marginBottom: 16,
  },
  hero: {
    borderRadius: 18,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 22,
  },
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroKicker: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 10,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 12,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Flush on both edges, like the subject grid on Home. `gap` plus a 48%
    // width left a couple of points dangling on the right, which is why the
    // left card read as narrower than the right one.
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 22,
  },
  yearCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  yearEmoji: {
    fontSize: 34,
    marginBottom: 12,
  },
  yearName: {
    fontSize: 17,
    fontWeight: '700',
  },
  yearHint: {
    fontSize: 13,
    marginTop: 2,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTitle: {
    ...typeScale.title2,
    fontSize: 20,
    fontWeight: '800',
  },
  backSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowHint: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  statusBar: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  status: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 12,
  },
  editBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  editInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  regenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginTop: 10,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  groupIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSub: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 16,
  },
  joinText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
