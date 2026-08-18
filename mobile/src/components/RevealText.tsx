import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme';
import { EASE, useReducedMotion } from '@/theme/motion';

/**
 * Reveals an answer progressively, the way a streamed one arrives.
 *
 * Two things it is honest about, because both change the design:
 *
 * **This is a reveal, not streaming.** `ask-gemini` returns one complete JSON
 * body — there is no SSE, no chunked transfer, nothing to subscribe to. The
 * whole answer is already in memory when this mounts. Calling it "streaming"
 * would be a lie told to ourselves in a variable name.
 *
 * **So it runs on a fixed budget, not a fixed rate.** The reference this was
 * adapted from reveals a word every 55ms, which is right when words genuinely
 * arrive one at a time. Here it would mean a 400-word answer to "discuss the
 * aetiology of jaundice" takes 22 seconds to become readable — text the user
 * already has, withheld for effect. Instead the whole reveal finishes in
 * BUDGET_MS whatever the length: long answers simply reveal faster. It reads as
 * the answer landing, never as a wait.
 *
 * Implemented as a character count on a single Text rather than one view per
 * word. A 400-word answer would otherwise be 400 views to lay out on a cheap
 * phone, and the flex-wrap needed to place them also breaks line breaking and
 * text selection.
 */

/** Total reveal time, regardless of how long the answer is. */
const BUDGET_MS = 650;
/** ~60fps. Fewer, larger steps would read as stuttering rather than writing. */
const TICK_MS = 16;
/** Below this there is nothing to reveal — show it and move on. */
const MIN_CHARS = 40;

export function RevealText({
  text,
  style,
  /** Skip the animation for text that was already on screen. */
  animate = true,
  /** Fires once the last character is out. */
  onDone,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  animate?: boolean;
  onDone?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const instant = !animate || reduceMotion || text.length < MIN_CHARS;
  const [shown, setShown] = useState(() => (instant ? text.length : 0));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Held in a ref so a caller passing an inline arrow does not restart the
  // reveal on every render of its parent.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (instant) {
      setShown(text.length);
      done.current?.();
      return;
    }
    const steps = Math.max(1, Math.round(BUDGET_MS / TICK_MS));
    const perStep = Math.ceil(text.length / steps);
    let count = 0;

    timer.current = setInterval(() => {
      count += perStep;
      if (count >= text.length) {
        setShown(text.length);
        if (timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        done.current?.();
        return;
      }
      setShown(count);
    }, TICK_MS);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [text, instant]);

  const complete = shown >= text.length;

  return (
    <Text style={style}>
      {text.slice(0, shown)}
      {complete ? null : <Caret />}
    </Text>
  );
}

/**
 * The writing caret. Fades rather than hard-blinking: a step-function blink is
 * the one piece of terminal nostalgia that reads as a rendering fault on a
 * phone, and it cannot run on the native driver as a step.
 */
function Caret() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 420,
          easing: EASE.inOut,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: EASE.inOut,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.caret, { backgroundColor: colors.fuchsia, opacity: pulse }]}
    />
  );
}

const styles = StyleSheet.create({
  caret: {
    width: 2,
    height: 13,
    borderRadius: 1,
    // Sits on the text baseline rather than the line box top.
    transform: [{ translateY: 2 }],
  },
});
