import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { isQuestionDone, toggleQuestionDone } from '@/lib/progress';
import {
  countStars,
  extractPageNumber,
  getCleanQuestionText,
  importanceLabel,
} from '@/lib/questionText';
import { useProgressVersion } from '@/hooks/useProgress';

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
  // Subscribing keeps this row in sync when progress is pulled from the cloud.
  useProgressVersion();

  const done = isQuestionDone(question);
  const stars = countStars(question);
  const page = extractPageNumber(question);
  const importance = importanceLabel(stars);
  const text = getCleanQuestionText(question);

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
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: done ? colors.cardElevated : colors.card,
          borderColor: done ? colors.success : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: done ? colors.success : colors.border,
            backgroundColor: done ? colors.success : 'transparent',
          },
        ]}>
        {done ? <Check size={14} color={colors.primaryText} strokeWidth={3} /> : null}
      </View>

      <View style={styles.body}>
        <Text
          style={[
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
              {'★'.repeat(Math.min(stars, 5))} asked {stars}×
            </Text>
          ) : null}
          {page ? (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>Pg. {page}</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={ask}
        hitSlop={10}
        style={({ pressed }) => [styles.askButton, { opacity: pressed ? 0.6 : 1 }]}>
        <Sparkles size={18} color={colors.accent} />
      </Pressable>
    </Pressable>
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
  },
  body: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
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
