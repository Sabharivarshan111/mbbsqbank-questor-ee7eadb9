import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SPRING, springTo, useReducedMotion } from '@/theme/motion';
import { useReorderLocked } from '@/components/ReorderLock';

/**
 * The app's press target.
 *
 * Two things it fixes that a bare Pressable did not:
 *
 *   1. **Feedback lands on press-down, not on release** (SKILL §1). The scale
 *      spring starts from `onPressIn`, so the element is already responding
 *      while the finger is still down. Waiting for the tap to complete before
 *      showing anything is what makes an interface feel dead.
 *
 *   2. **It is interruptible** (SKILL §3). Animated.spring animates from the
 *      value's *current* position, so a press released mid-shrink springs back
 *      from wherever it visibly is. A timing animation would restart from the
 *      logical value and visibly jump.
 *
 * Both springs run on the native driver, so a busy JS thread cannot stutter
 * them — the case that matters on the cheap phones most of our users have.
 *
 * Accessibility is part of the contract rather than an afterthought: `label`
 * is required, the role defaults to "button", and every target gets hit
 * padding so a 32dp icon still meets the 44dp touch minimum.
 */

export interface TouchableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Spoken by TalkBack. Required — an unlabelled control is unusable blind. */
  label: string;
  /** Extra context TalkBack reads after the label, e.g. "Opens the year picker". */
  hint?: string;
  role?: AccessibilityRole;
  /** Selected/checked/expanded/disabled state for assistive tech. */
  state?: {
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
    disabled?: boolean;
    busy?: boolean;
  };
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** How far to shrink on press. Bigger surfaces need less. */
  scaleTo?: number;
  /** Set false for full-bleed rows, where a scale reads as a glitch. */
  scale?: boolean;
  /** Dim as well as shrink. Useful on flat rows with no card behind them. */
  dim?: boolean;
  hitSlop?: number | Insets;
  /**
   * Extra actions for assistive tech. Anything reachable only by a gesture a
   * screen-reader user cannot perform — a multi-tap, a drag — belongs here as
   * well, or it is simply unavailable to them.
   */
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (name: string) => void;
  testID?: string;
}

const DEFAULT_HIT_SLOP = 8;

/**
 * The press target and the animated node have to be the *same* view. Wrapping
 * the children in a separate Animated.View instead would insert a layout box
 * between the Pressable and its children, so any flex style on the Pressable
 * (`flexDirection: 'row'`, `flex: 1`) would apply to that wrapper rather than
 * to the content — silently breaking every row layout that uses it.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Touchable({
  children,
  onPress,
  onLongPress,
  label,
  hint,
  role = 'button',
  state,
  disabled,
  style,
  scaleTo = 0.97,
  scale = true,
  dim = false,
  hitSlop = DEFAULT_HIT_SLOP,
  accessibilityActions,
  onAccessibilityAction,
  testID,
}: TouchableProps) {
  const reduceMotion = useReducedMotion();
  /**
   * Set while the surrounding screen is being rearranged. The control still
   * looks and feels alive — it is being dragged, after all — but it does not
   * fire. See ReorderLock.tsx for why this is here and not at the call sites.
   */
  const locked = useReorderLocked();
  const pressed = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (value: number) => {
      // SPRING.snappy: critically damped and quick. Press feedback must never
      // overshoot — a button that bounces after a tap reads as a bug, not
      // physicality (SKILL §4).
      springTo(pressed, value, { spring: SPRING.snappy, reduceMotion }).start();
    },
    [pressed, reduceMotion],
  );

  const onPressIn = useCallback(() => animateTo(1), [animateTo]);
  const onPressOut = useCallback(() => animateTo(0), [animateTo]);

  const animatedStyle = useMemo(() => {
    // Under reduced motion, scale is replaced by opacity: a gentler
    // equivalent, not the absence of feedback (SKILL §14).
    const useScale = scale && !reduceMotion;
    const wantsDim = dim || reduceMotion || !scale;
    return {
      ...(useScale
        ? {
            transform: [
              {
                scale: pressed.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, scaleTo],
                }),
              },
            ],
          }
        : null),
      ...(wantsDim
        ? {
            opacity: pressed.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.6],
            }),
          }
        : null),
    };
  }, [dim, pressed, reduceMotion, scale, scaleTo]);

  const isDisabled = disabled || state?.disabled;

  return (
    <AnimatedPressable
      onPress={locked ? undefined : onPress}
      onLongPress={locked ? undefined : onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ ...state, disabled: isDisabled }}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={
        onAccessibilityAction
          ? event => onAccessibilityAction(event.nativeEvent.actionName)
          : undefined
      }
      style={[style, animatedStyle, isDisabled && styles.disabled]}>
      {children}
    </AnimatedPressable>
  );
}

/**
 * Wrap a control smaller than the 44dp touch minimum. The visual size stays
 * whatever the design calls for; only the tappable area grows.
 */
export function TouchTarget({
  children,
  size = 44,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ minWidth: size, minHeight: size }, styles.center, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
