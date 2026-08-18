import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme';
import { EASE, useReducedMotion } from '@/theme/motion';

const DOTS = 3;
/** One dot's full up-and-down. */
const CYCLE_MS = 900;
/** Offset between dots. 120ms reads as a wave; below ~60ms they pulse as one. */
const OFFSET_MS = 120;

/**
 * "The model is working on it."
 *
 * Replaces an ActivityIndicator, which says *something* is loading but not
 * that a specific answer is being written — and which is the same spinner the
 * OS uses for everything from a network fetch to a spinning cursor.
 *
 * Three properties make this correct rather than decorative:
 *
 * 1. **It loops on the native driver.** A generating response is exactly when
 *    the JS thread is busiest — parsing a payload, re-rendering a transcript —
 *    and an indicator that stutters while the app thinks is worse than none,
 *    because a stalled spinner reads as a hung app. This is the React Native
 *    equivalent of the rule that predetermined motion belongs in CSS rather
 *    than requestAnimationFrame: it runs off the thread doing the work.
 * 2. **Nothing scales from 0.** The dots breathe between 0.7 and 1 with the
 *    opacity carrying most of the signal. A dot appearing from nothing reads
 *    as a glitch, not a pulse.
 * 3. **Reduced motion keeps the meaning.** The wave stops, the dots stay at
 *    full opacity, and the label carries the state. "Reduced" is fewer and
 *    gentler, not nothing — a user who dislikes motion still needs to know the
 *    app is waiting on something.
 */
export function ThinkingDots({ label }: { label: string }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // One value per dot, created once.
  const values = useMemo(
    () => Array.from({ length: DOTS }, () => new Animated.Value(0)),
    [],
  );
  const loops = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (reduceMotion) {
      values.forEach(value => value.setValue(0));
      return;
    }

    loops.current = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          // The stagger is a delay on each dot's own loop rather than a
          // sequence across all three, so every dot keeps a constant period
          // and the wave never drifts out of phase.
          Animated.delay(i * OFFSET_MS),
          Animated.timing(value, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            easing: EASE.inOut,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: CYCLE_MS / 2,
            easing: EASE.inOut,
            useNativeDriver: true,
          }),
          Animated.delay((DOTS - 1 - i) * OFFSET_MS),
        ]),
      ),
    );
    loops.current.forEach(loop => loop.start());

    return () => {
      loops.current.forEach(loop => loop.stop());
      loops.current = [];
    };
  }, [reduceMotion, values]);

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.dots} importantForAccessibility="no-hide-descendants">
        {values.map((value, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: colors.fuchsia,
                opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [
                  { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
  },
});
