import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme, withAlpha } from '@/theme';
import {
  SPRING,
  panVelocityToSpring,
  springConfig,
  springTo,
  useReducedMotion,
} from '@/theme/motion';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 28;
/** How close to a detent counts as landing on it, as a fraction of the range. */
const DETENT_PULL = 0.05;

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  /** Every emitted value is rounded to this. */
  step: number;
  onChange: (value: number) => void;
  /** Spoken by TalkBack. Required, like everywhere else in this app. */
  label: string;
  /** Turns the value into words: "108%", "12 minutes". Spoken and shown. */
  format: (value: number) => string;
  /**
   * Values the thumb settles onto when released nearby. A detent is what lets
   * someone get exactly back to the default without nudging pixel by pixel —
   * the one value on the scale that has a name is worth being able to hit.
   */
  detents?: number[];
  /** Marks drawn under the track. Orientation, not decoration. */
  ticks?: number[];
}

/**
 * A single-value slider.
 *
 * The behaviour that makes it feel like a physical control rather than a form
 * field, in the order it matters:
 *
 *   • **The thumb is glued to the finger.** During a drag the position is set
 *     directly from the touch, never eased towards it (SKILL §2). Easing here
 *     is the single most common way a slider feels broken: the value you are
 *     reading is not the place you are touching.
 *   • **Release hands its velocity to a spring** (SKILL §5), so a flick that
 *     lands on a detent arrives with the momentum it was thrown with instead
 *     of stopping dead and then animating.
 *   • **Value changes are emitted on the step, not on the frame.** A slider
 *     that calls back 60 times a second re-renders whatever it is driving 60
 *     times a second; on the phones this app targets that is what turns a
 *     smooth drag into a stuttering one. Rounding to the step bounds it to as
 *     many updates as there are distinguishable values.
 *   • **The fill is `scaleX`, never an animated width.** Same reason as every
 *     other bar in the app: width is a layout property.
 *
 * The container claims the gesture on touch-down, which also stops a drag that
 * starts here from being read as a swipe by whatever is behind it — a slider
 * inside a bottom sheet would otherwise dismiss the sheet.
 */
export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
  detents,
  ticks,
}: SliderProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - THUMB_SIZE);

  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  /**
   * The track's left edge in window coordinates.
   *
   * The obvious source is `nativeEvent.locationX` — the touch's offset inside
   * the view that owns the responder — but it is not populated everywhere
   * (react-native-web leaves it undefined, which silently turns every
   * computed value into NaN and makes the control look inert rather than
   * broken). `pageX` is universal, so the origin is measured once instead.
   */
  const originX = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const held = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const placed = useRef(false);
  // The last value handed out, so a drag emits once per step rather than once
  // per frame. A ref, not state: the drag must not depend on a re-render.
  const emitted = useRef(value);

  const range = max - min;
  const toX = useCallback(
    (next: number) => ((next - min) / range) * travel,
    [min, range, travel],
  );
  const toValue = useCallback(
    (px: number) => {
      const raw = min + (px / (travel || 1)) * range;
      return Math.min(max, Math.max(min, Math.round(raw / step) * step));
    },
    [max, min, range, step, travel],
  );

  // Follow the value when it changes from outside — a reset, a preset button.
  // Never while dragging: the finger is the authority then, and re-seeking to
  // the prop would fight it.
  useEffect(() => {
    if (dragging.current || travel <= 0) {
      return;
    }
    emitted.current = value;
    const target = toX(value);
    if (!placed.current) {
      placed.current = true;
      x.setValue(target);
      return;
    }
    springTo(x, target, { spring: SPRING.default, reduceMotion }).start();
  }, [value, travel, toX, x, reduceMotion]);

  const emit = useCallback(
    (px: number) => {
      const next = toValue(px);
      // Floats: 1.08 built by arithmetic is not always 1.08.
      if (Math.abs(next - emitted.current) >= step / 2) {
        emitted.current = next;
        onChange(next);
      }
      return next;
    },
    [onChange, step, toValue],
  );

  /** Window x of a touch → thumb-centre offset along the track. */
  const positionOf = useCallback(
    (pageX: number) =>
      Math.min(travel, Math.max(0, pageX - originX.current - THUMB_SIZE / 2)),
    [travel],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          if (travel <= 0) {
            return;
          }
          dragging.current = true;
          // Tapping the track moves the thumb there, so the whole control is
          // the target rather than a 28dp circle.
          const px = positionOf(event.nativeEvent.pageX);
          x.stopAnimation();
          x.setValue(px);
          emit(px);
          if (!reduceMotion) {
            Animated.spring(held, { toValue: 1, ...springConfig(SPRING.snappy) }).start();
          }
        },
        // The gesture's dx is deliberately unused: locationX is already the
        // position within this view, so reading it directly keeps a drag that
        // began anywhere on the track — not just on the thumb — correct.
        onPanResponderMove: event => {
          if (travel <= 0) {
            return;
          }
          const px = positionOf(event.nativeEvent.pageX);
          x.setValue(px);
          emit(px);
        },
        onPanResponderRelease: (_event, gesture) => {
          dragging.current = false;
          if (!reduceMotion) {
            Animated.spring(held, { toValue: 0, ...springConfig(SPRING.snappy) }).start();
          } else {
            held.setValue(0);
          }
          let settled = emitted.current;
          const pull = range * DETENT_PULL;
          for (const detent of detents ?? []) {
            if (Math.abs(settled - detent) <= pull) {
              settled = detent;
              break;
            }
          }
          if (Math.abs(settled - emitted.current) >= step / 2) {
            emitted.current = settled;
            onChange(settled);
          }
          const target = toX(settled);
          if (reduceMotion) {
            x.setValue(target);
            return;
          }
          Animated.spring(x, {
            toValue: target,
            ...springConfig(SPRING.momentum),
            velocity: panVelocityToSpring(gesture.vx),
          }).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [detents, emit, held, onChange, positionOf, range, reduceMotion, step, toX, travel, x],
  );

  const fill = travel > 0 ? Animated.divide(Animated.add(x, THUMB_SIZE / 2), width) : 0;

  return (
    <View
      ref={rootRef}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
        rootRef.current?.measureInWindow(windowX => {
          originX.current = windowX;
        });
      }}
      style={styles.root}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(((value - min) / range) * 100),
        text: format(value),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        // TalkBack's adjustable role is swipe up / swipe down, and it is the
        // only way to move this control without a precise drag.
        const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
        onChange(Math.min(max, Math.max(min, Math.round((value + delta) / step) * step)));
      }}
      {...responder.panHandlers}>
      <View style={[styles.track, { backgroundColor: withAlpha(colors.text, 0.14) }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: colors.accent,
              transform: [{ scaleX: fill }],
            },
          ]}
        />
      </View>

      {ticks?.length ? (
        <View pointerEvents="none" style={styles.ticks}>
          {ticks.map(tick => (
            <View
              key={tick}
              style={[
                styles.tick,
                {
                  backgroundColor: withAlpha(colors.text, 0.22),
                  left: THUMB_SIZE / 2 + toX(tick) - StyleSheet.hairlineWidth,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: colors.accent,
            borderColor: colors.background,
            transform: [
              { translateX: x },
              // 1 → 1.18 while held. Grows, never appears: see the "nothing
              // scales from 0" rule in CLAUDE.md.
              { scale: held.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    marginHorizontal: THUMB_SIZE / 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Grows from the left edge rather than the centre. Without this the bar
    // would expand both ways from the middle.
    transformOrigin: 'left',
  },
  ticks: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  tick: {
    position: 'absolute',
    bottom: 2,
    width: StyleSheet.hairlineWidth * 2,
    height: 6,
    borderRadius: 1,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    height: THUMB_SIZE,
    width: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
