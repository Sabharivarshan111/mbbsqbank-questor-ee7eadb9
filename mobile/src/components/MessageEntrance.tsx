import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';

/**
 * Fades and lifts a chat message into place the first time it renders.
 *
 * The purpose is *preventing a jarring change*, not decoration. An answer can
 * be several hundred words, and a block that size appearing between one frame
 * and the next reads as the screen having jumped rather than as a reply having
 * arrived — the reader has to re-find their place. 220ms of fade plus an 8dp
 * rise is enough to say "this is new, it came from below" and short enough
 * that nobody waits for it.
 *
 * Timing, not a spring: nothing here was thrown or dragged, so there is no
 * velocity to carry and no reason to overshoot. `EASE.out` because it is an
 * entrance — an ease-in would hold the message still for the first 100ms,
 * which is precisely when the user is looking for it.
 *
 * It animates **once**, on mount. Re-running on every re-render would mean the
 * whole transcript re-animating each time a new message arrived, which is the
 * "everything moves whenever anything changes" failure.
 */
export function MessageEntrance({
  children,
  from = 8,
}: {
  children: React.ReactNode;
  /** How far below its resting place the message starts, in dp. */
  from?: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
    // Mount only — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        opacity: progress,
        // Under reduced motion the translate is dropped entirely and only the
        // fade remains: the change stays legible without anything moving.
        transform: reduceMotion
          ? []
          : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
      }}>
      {children}
    </Animated.View>
  );
}
