import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { CornerDownLeft, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';

/**
 * What to do next, under a finished answer.
 *
 * Adapted from the follow-ups row in the reference chat, with the suggestions
 * chosen for this app rather than copied: after reading an answer the three
 * things a student actually wants are to test themselves on it, to have it
 * again in plainer language, or to see what gets asked about it in exams.
 *
 * They are generated from the question, not fixed strings, so they always refer
 * to the thing on screen.
 *
 * Appears only when the answer is complete. A follow-up offered while the text
 * is still arriving invites a tap that would cancel what the user is waiting
 * for, and the row moving as the answer grows would drag the eye away from it.
 */

export interface FollowUp {
  label: string;
  prompt: string;
}

/** The follow-ups for a given question. */
export function followUpsFor(question: string): FollowUp[] {
  const topic = question.trim();
  return [
    { label: 'Test me on this', prompt: `Double-tapped: ${topic}` },
    { label: 'Explain it simply', prompt: `Explain this in simpler terms, as if teaching a junior:\n\n${topic}` },
    { label: 'What gets asked in exams', prompt: `For this medical topic, list the specific sub-questions most often asked in MBBS university exams, and what an examiner looks for in each:\n\n${topic}` },
  ];
}

export function AnswerActions({
  followUps,
  onPick,
  onRetry,
  disabled,
}: {
  followUps: FollowUp[];
  onPick: (prompt: string) => void;
  onRetry?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter,
          transform: reduceMotion
            ? []
            : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
      ]}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.textMuted }]}>Follow-ups</Text>
        {onRetry ? (
          <Touchable
            onPress={onRetry}
            disabled={disabled}
            label="Ask again"
            hint="Sends the same question again"
            hitSlop={10}
            scaleTo={0.9}
            style={styles.retry}>
            <RefreshCw size={13} color={colors.textMuted} />
            <Text style={[styles.retryText, { color: colors.textMuted }]}>Ask again</Text>
          </Touchable>
        ) : null}
      </View>

      {followUps.map(item => (
        <Touchable
          key={item.label}
          onPress={() => onPick(item.prompt)}
          disabled={disabled}
          label={item.label}
          scale={false}
          dim
          style={[styles.row, { borderBottomColor: colors.border }]}>
          <CornerDownLeft size={13} color={colors.cyan} />
          <Text style={[styles.rowText, { color: colors.text }]}>{item.label}</Text>
        </Touchable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // Keeps the 44dp target without padding that would move the label.
    minHeight: 32,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    fontSize: 13.5,
  },
});
