import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Check, X } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { typeScale } from '@/theme/typography';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import type { Mcq } from '@/lib/askAi';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

/**
 * One practice question, answerable in place.
 *
 * Answering is a commitment, so it is one-way: once an option is chosen the
 * card locks and shows which was right. Letting people re-pick would turn a
 * self-test into a guessing game and make the result meaningless — the point of
 * a quiz card is that the first answer is the honest one.
 *
 * The explanation is revealed rather than always visible. Showing it up front
 * gives the answer away; hiding it behind a second tap makes the person do the
 * extra tap every single time. It appears with the result, which is the moment
 * it becomes useful.
 */
function McqCardBase({ item, index }: { item: Mcq; index: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);

  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!picked) {
      return;
    }
    if (reduceMotion) {
      reveal.setValue(1);
      return;
    }
    Animated.timing(reveal, {
      toValue: 1,
      duration: DURATION.base,
      // Decelerating: the result should arrive fast and settle, never ease in.
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [picked, reduceMotion, reveal]);

  const choose = useCallback(
    (letter: string) => {
      // First answer only — see the note above.
      setPicked(prev => prev ?? letter);
    },
    [],
  );

  const correct = picked === item.correct;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.number, { color: colors.textMuted }]}>Q{index + 1}</Text>
        {item.topic ? (
          <View style={[styles.chip, { borderColor: withAlpha(colors.fuchsia, 0.5) }]}>
            <Text style={[styles.chipText, { color: colors.fuchsia }]}>{item.topic}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[typeScale.callout, styles.question, { color: colors.text }]}>
        {item.question}
      </Text>

      <View style={styles.options}>
        {LETTERS.map(letter => {
          const isAnswer = letter === item.correct;
          const isPicked = letter === picked;
          // Before answering: neutral. After: the right one is always marked,
          // and a wrong pick is marked too, so the person sees both what they
          // chose and what was true.
          const showRight = picked !== null && isAnswer;
          const showWrong = isPicked && !isAnswer;

          const border = showRight
            ? colors.success
            : showWrong
            ? colors.danger
            : colors.border;
          const background = showRight
            ? withAlpha(colors.success, 0.12)
            : showWrong
            ? withAlpha(colors.danger, 0.12)
            : colors.cardElevated;

          const body = (
            <>
              <View
                style={[
                  styles.letter,
                  { borderColor: border, backgroundColor: withAlpha(colors.text, 0.06) },
                ]}>
                <Text style={[styles.letterText, { color: colors.text }]}>{letter}</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                {item.options[letter]}
              </Text>
              {showRight ? <Check size={16} color={colors.success} strokeWidth={3} /> : null}
              {showWrong ? <X size={16} color={colors.danger} strokeWidth={3} /> : null}
            </>
          );
          const frame = [styles.option, { borderColor: border, backgroundColor: background }];

          // Once answered, an option stops being a control and becomes a
          // result, so it is rendered as one.
          //
          // The obvious alternative — keeping the Touchable and passing
          // `disabled` — was wrong twice over. Touchable dims a disabled target
          // to 45% opacity, which faded the *correct answer* along with
          // everything else, and `accessibilityState.disabled` makes TalkBack
          // skip a control entirely, so a blind user could not read back the
          // options they had just been quizzed on. Both are worse than the
          // problem being solved.
          if (picked !== null) {
            return (
              <View
                key={letter}
                style={frame}
                accessible
                // One sentence per row, not four fragments: the letter, the
                // text, and what became of it.
                accessibilityLabel={`Option ${letter}. ${item.options[letter]}.${
                  isAnswer ? ' Correct answer.' : ''
                }${showWrong ? ' Your answer, incorrect.' : ''}`}>
                {body}
              </View>
            );
          }

          return (
            <Touchable
              key={letter}
              onPress={() => choose(letter)}
              label={`Option ${letter}. ${item.options[letter]}`}
              scaleTo={0.99}
              style={frame}>
              {body}
            </Touchable>
          );
        })}
      </View>

      {picked !== null ? (
        <Animated.View
          style={[
            styles.result,
            {
              opacity: reveal,
              // Rises a few dp into place. Small enough to read as the text
              // settling rather than as a panel flying in.
              transform: [
                {
                  translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
                },
              ],
            },
          ]}>
          <Text
            style={[styles.verdict, { color: correct ? colors.success : colors.danger }]}
            accessibilityLiveRegion="polite">
            {correct ? 'Correct' : `Incorrect — the answer is ${item.correct}`}
          </Text>
          {item.explanation ? (
            <Text style={[styles.explanation, { color: colors.textMuted }]}>
              {item.explanation}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  question: {
    fontWeight: '600',
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    // 44dp minimum without padding that would change the design.
    minHeight: 44,
  },
  letter: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  result: {
    gap: 4,
  },
  verdict: {
    fontSize: 13,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
  },
});

export const McqCard = memo(McqCardBase);
