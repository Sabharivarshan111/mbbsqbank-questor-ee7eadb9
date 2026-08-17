import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { typeScale } from '@/theme/typography';
import { SPRING, springConfig, useReducedMotion } from '@/theme/motion';
import { toggleQuestionDone } from '@/lib/progress';
import {
  countStars,
  extractPageNumber,
  getCleanQuestionText,
  importanceLabel,
} from '@/lib/questionText';
import { useQuestionDone } from '@/hooks/useProgress';
import { doubleTapPrompt, tripleTapPrompt } from '@/lib/askAi';

interface Props {
  question: string;
  index: number;
  /** Triple tap — the full worked answer, written up as a note. */
  onAskAi: (question: string) => void;
  /** Double tap — practice MCQs generated from this question. */
  onAskMcq?: (question: string) => void;
}

/**
 * Matches the tap model of the published app, which the first native port had
 * flattened into "tap the row to tick it" plus a sparkle button:
 *
 *   • the checkbox      → mark done          (its own target, own hit slop)
 *   • double tap a row  → MCQs from it
 *   • triple tap a row  → the handwritten note / worked answer
 *
 * The 280ms window is the published app's value (QuestionCardEnhanced.tsx), not
 * a guess. A third tap fires immediately rather than waiting out the window,
 * because by then the intent is unambiguous — waiting would only add lag to the
 * deliberate gesture (apple-design §10: minimise disambiguation delays, and pay
 * the cost only where the ambiguity is real).
 *
 * Multi-tap is unusable with a screen reader, so the same two actions are also
 * exposed as `accessibilityActions`. TalkBack surfaces them in its actions
 * menu; nobody has to land three taps on a moving list to reach a feature.
 */
function QuestionRowBase({ question, index, onAskAi, onAskMcq }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  // Subscribes to *this* question only, so ticking one row does not re-render
  // every other row mounted in the list.
  const done = useQuestionDone(question);

  const stars = countStars(question);
  const page = extractPageNumber(question);
  const importance = importanceLabel(stars);
  const text = getCleanQuestionText(question);

  const tick = useRef(new Animated.Value(done ? 1 : 0)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      tick.setValue(done ? 1 : 0);
      return;
    }
    if (reduceMotion) {
      tick.setValue(done ? 1 : 0);
      return;
    }
    Animated.spring(tick, {
      toValue: done ? 1 : 0,
      ...springConfig(done ? SPRING.momentum : SPRING.snappy),
    }).start();
  }, [done, reduceMotion, tick]);

  const toggle = useCallback(() => {
    toggleQuestionDone(question);
  }, [question]);

  // Both prompts are built in src/lib/askAi.ts, which owns the markers and
  // intent flags the edge function needs. Hand-writing the prose here is what
  // previously sent MCQ requests down the generic-chatbot path.
  const askAnswer = useCallback(() => {
    onAskAi(tripleTapPrompt(getCleanQuestionText(question)));
  }, [onAskAi, question]);

  const askMcq = useCallback(() => {
    const prompt = doubleTapPrompt(getCleanQuestionText(question));
    (onAskMcq ?? onAskAi)(prompt);
  }, [onAskAi, onAskMcq, question]);

  // ---- tap disambiguation --------------------------------------------------
  const taps = useRef(0);
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const onRowTap = useCallback(() => {
    const now = Date.now();
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    taps.current = now - lastTap.current > TAP_WINDOW_MS ? 1 : taps.current + 1;
    lastTap.current = now;

    if (taps.current >= 3) {
      taps.current = 0;
      askAnswer();
      return;
    }

    timer.current = setTimeout(() => {
      if (taps.current === 2) {
        askMcq();
      }
      taps.current = 0;
      timer.current = null;
    }, TAP_WINDOW_MS);
  }, [askAnswer, askMcq]);

  const importanceColor =
    importance === 'must-know'
      ? colors.danger
      : importance === 'important'
      ? colors.warning
      : colors.textMuted;

  return (
    <Touchable
      onPress={onRowTap}
      label={text}
      hint="Double tap twice for MCQs, three times for a written answer"
      // The gestures above are unreachable with a screen reader; these are.
      accessibilityActions={[
        { name: 'mcqs', label: 'Practice MCQs' },
        { name: 'answer', label: 'Written answer' },
      ]}
      onAccessibilityAction={name => {
        if (name === 'mcqs') {
          askMcq();
        } else if (name === 'answer') {
          askAnswer();
        }
      }}
      scaleTo={0.985}
      style={[
        styles.row,
        {
          backgroundColor: done ? colors.cardElevated : colors.card,
          borderColor: done ? colors.success : colors.border,
        },
      ]}>
      <View style={styles.main}>
        {/* Its own control, so ticking never has to survive tap counting. */}
        <Touchable
          onPress={toggle}
          role="checkbox"
          state={{ checked: done }}
          label={done ? 'Mark as not done' : 'Mark as done'}
          hitSlop={14}
          scaleTo={0.85}>
          <View style={[styles.checkbox, { borderColor: done ? colors.success : colors.border }]}>
            <Animated.View
              style={[
                styles.checkboxFill,
                {
                  backgroundColor: colors.success,
                  opacity: tick,
                  transform: [
                    { scale: tick.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                },
              ]}
            />
            {done ? <Check size={14} color={colors.primaryText} strokeWidth={3} /> : null}
          </View>
        </Touchable>

        <View style={styles.body}>
          <Text style={[styles.affordance, { color: colors.cyan }]}>
            Triple tap → handwritten note
          </Text>

          <Text
            style={[
              typeScale.callout,
              styles.text,
              {
                color: done ? colors.textMuted : colors.text,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}>
            {index + 1}. {text}
          </Text>

          <View style={styles.meta}>
            {stars > 0 ? (
              <Text style={[styles.metaText, { color: importanceColor }]}>
                {'★'.repeat(Math.min(stars, 5))}
              </Text>
            ) : null}
            {page ? (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>Pg. {page}</Text>
            ) : null}
          </View>

          <Text style={[styles.affordanceMcq, { color: colors.cyan }]}>DOUBLE TAP FOR MCQS</Text>
        </View>

        {/* How many times this has been asked in past papers. */}
        {stars > 0 ? (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.cardElevated, borderColor: colors.border },
            ]}>
            <Text style={[styles.countText, { color: colors.text }]}>{stars}</Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
}

/** The published app's disambiguation window (QuestionCardEnhanced.tsx). */
const TAP_WINDOW_MS = 280;

const styles = StyleSheet.create({
  row: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    overflow: 'hidden',
  },
  checkboxFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  body: {
    flex: 1,
  },
  affordance: {
    ...typeScale.caption,
    fontWeight: '600',
  },
  text: {
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  affordanceMcq: {
    ...typeScale.caption,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    marginTop: 8,
  },
  countBadge: {
    height: 26,
    width: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export const QuestionRow = memo(QuestionRowBase);
