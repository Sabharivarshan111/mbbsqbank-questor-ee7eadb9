import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Check, Sparkles } from 'lucide-react-native';
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

interface Props {
  question: string;
  index: number;
  onAskAi: (question: string) => void;
}

/**
 * One question. Tapping the row toggles completion; the sparkle button sends
 * the question to the AI tab (the web app's triple-tap gesture, made explicit
 * because hidden multi-tap gestures are poor practice on native).
 */
function QuestionRowBase({ question, index, onAskAi }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  // Subscribes to *this* question only, so ticking one row does not re-render
  // every other row mounted in the list.
  const done = useQuestionDone(question);
  const stars = countStars(question);
  const page = extractPageNumber(question);
  const importance = importanceLabel(stars);
  const text = getCleanQuestionText(question);

  /**
   * Completion is the one moment in this screen worth animating: it is a
   * completion event, which is exactly the kind of feedback that earns its
   * place (SKILL §13 Utility). The fill springs in with a little overshoot so
   * a tick feels like it landed, and collapses without bounce when undone —
   * an untick is a correction, not an achievement.
   *
   * It grows from 0.6, never from 0. Nothing in the real world appears from
   * nothing, and a scale(0) entrance reads as materialising out of the void
   * (animate/SKILL.md "Never Ship").
   */
  const tick = useRef(new Animated.Value(done ? 1 : 0)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      // Rows scrolling into view must not replay the animation; only a real
      // change should.
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

  const ask = useCallback(() => {
    onAskAi(getCleanQuestionText(question));
  }, [onAskAi, question]);

  const importanceColor =
    importance === 'must-know'
      ? colors.danger
      : importance === 'important'
      ? colors.warning
      : colors.textMuted;

  return (
    <Touchable
      onPress={toggle}
      role="checkbox"
      state={{ checked: done }}
      // TalkBack reads the question itself, not "row 12" — the position is
      // meaningless without the content.
      label={text}
      hint={done ? 'Double tap to mark as not done' : 'Double tap to mark as done'}
      scaleTo={0.985}
      style={[
        styles.row,
        {
          backgroundColor: done ? colors.cardElevated : colors.card,
          borderColor: done ? colors.success : colors.border,
        },
      ]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: done ? colors.success : colors.border,
          },
        ]}>
        <Animated.View
          style={[
            styles.checkboxFill,
            {
              backgroundColor: colors.success,
              opacity: tick,
              transform: [
                {
                  scale: tick.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            },
          ]}
        />
        {done ? <Check size={14} color={colors.primaryText} strokeWidth={3} /> : null}
      </View>

      <View style={styles.body}>
        <Text
          style={[
            typeScale.callout,
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
              {'★'.repeat(Math.min(stars, 5))} asked {stars}×
            </Text>
          ) : null}
          {page ? (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>Pg. {page}</Text>
          ) : null}
        </View>
      </View>

      <Touchable
        onPress={ask}
        label="Ask AI about this question"
        scaleTo={0.85}
        // An 18dp icon needs padding to clear the 44dp touch minimum.
        hitSlop={14}
        style={styles.askButton}>
        <Sparkles size={18} color={colors.accent} />
      </Touchable>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
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
  askButton: {
    padding: 4,
    marginTop: 2,
  },
});

export const QuestionRow = memo(QuestionRowBase);
