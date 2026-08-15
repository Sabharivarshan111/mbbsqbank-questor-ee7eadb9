import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useTheme, withAlpha } from '@/theme';
import { typeScale } from '@/theme/typography';
import {
  DURATION,
  EASE,
  SPRING,
  panVelocityToSpring,
  project,
  rubberband,
  springConfig,
  useReducedMotion,
} from '@/theme/motion';

/**
 * Bottom sheet.
 *
 * Replaces `<Modal animationType="slide">`, which is a fixed OS curve that
 * cannot be grabbed, cannot inherit the finger's velocity, and always takes
 * the same time whether the user flicked it or nudged it.
 *
 * What this does instead, following .claude/skills/apple-design/SKILL.md:
 *
 *   §2  Drag tracks the finger 1:1 — the sheet is glued to the touch, not
 *       eased toward it.
 *   §3  Interruptible. Grabbing a sheet that is mid-animation reads its live
 *       on-screen position (`stopAnimation` hands back the presentation
 *       value) and continues from there, so there is never a jump.
 *   §5  Release velocity is handed to the spring, so there is no seam between
 *       the drag and the animation that finishes it.
 *   §6  The dismiss decision comes from where the flick is *projected* to
 *       land, not from where the finger happened to let go. A short fast
 *       flick dismisses; a long slow drag that stopped short does not.
 *   §7  It leaves the way it arrived — always downward, never sideways.
 *   §9  Dragging up past the open position rubber-bands instead of stopping
 *       dead.
 *   §12 A dimming scrim marks this as a modal task, and the scrim tracks the
 *       drag so the background brightens as the sheet leaves.
 *   §14 Under "Remove animations" the whole thing becomes a cross-fade and
 *       the drag gesture is retired, since dragging without motion is
 *       meaningless.
 */

/** Fraction of the sheet's height the projected landing point must pass. */
const DISMISS_FRACTION = 0.4;
/** Below this, treat a release as a flick regardless of distance travelled. */
const FLICK_VELOCITY = 0.35; // points per millisecond, PanResponder units

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Right-hand action in the header, e.g. a Save button. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Set false when there is nothing behind the sheet to go back to — first-run
   * onboarding, for instance. It disables *every* casual exit at once: the
   * scrim tap, the drag, the grabber and the default Done button. Gating only
   * one of them is how a "non-dismissable" sheet ends up swipe-dismissable.
   */
  dismissable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Sheet({
  visible,
  onClose,
  title,
  headerRight,
  children,
  dismissable = true,
  contentStyle,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Kept mounted for the duration of the exit animation, so the sheet is
  // still on screen while it leaves.
  const [mounted, setMounted] = useState(visible);

  const screenHeight = Dimensions.get('window').height;
  // Kept in both a ref and state: the ref is what the pan responder reads
  // (always current, never re-creates the responder), the state is what the
  // scrim's interpolation range is built from (needs a render to take effect).
  const heightRef = useRef(screenHeight * 0.5);
  const [sheetHeight, setSheetHeight] = useState(screenHeight * 0.5);
  // 0 = fully open, `height` = fully dismissed. One axis only; there is no
  // horizontal motion to desync from (SKILL §3's X/Y decomposition is moot).
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const fade = useRef(new Animated.Value(0)).current;
  // Where the sheet sat when the current drag began, so moves are applied as
  // an offset from the live position rather than from zero.
  const dragOrigin = useRef(0);

  const animateOut = useCallback(
    (velocity?: number) => {
      const target = heightRef.current;
      Animated.parallel([
        reduceMotion
          ? Animated.timing(fade, {
              toValue: 0,
              duration: DURATION.fast,
              easing: EASE.out,
              useNativeDriver: true,
            })
          : Animated.timing(fade, {
              toValue: 0,
              duration: DURATION.base,
              easing: EASE.out,
              useNativeDriver: true,
            }),
        reduceMotion
          ? Animated.timing(translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          : Animated.spring(translateY, {
              toValue: target,
              ...springConfig(SPRING.dismiss),
              ...(velocity === undefined ? null : { velocity }),
            }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    },
    [fade, reduceMotion, translateY],
  );

  const animateIn = useCallback(() => {
    if (reduceMotion) {
      translateY.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }),
      // Damping 0.8: a sheet rising into place is a physical arrival, which is
      // the case Apple reserves overshoot for (SKILL §4).
      Animated.spring(translateY, { toValue: 0, ...springConfig(SPRING.sheet) }),
    ]).start();
  }, [fade, reduceMotion, translateY]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(reduceMotion ? 0 : heightRef.current || screenHeight);
      animateIn();
    } else if (mounted) {
      animateOut();
    }
    // `mounted` is deliberately not a dependency: reacting to it would re-run
    // the exit animation when it flips false at the end of that same exit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const requestClose = useCallback(() => {
    // Ask the owner to close; the exit animation runs off the `visible` prop
    // so the parent stays the single source of truth.
    onClose();
  }, [onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Let taps through; only claim the gesture once it is clearly a
        // vertical drag. ~8dp of hysteresis, and a 2:1 bias against
        // horizontal movement so a sideways swipe never grabs the sheet
        // (SKILL §10).
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 2,
        onPanResponderGrant: () => {
          // Read the *presentation* value. If the sheet was mid-flight, the
          // drag continues from where it visibly is (SKILL §3).
          translateY.stopAnimation(value => {
            dragOrigin.current = value;
          });
        },
        onPanResponderMove: (_event, gesture) => {
          const next = dragOrigin.current + gesture.dy;
          // Downward is free 1:1 movement; upward past the open position
          // resists progressively rather than hitting a wall (SKILL §9).
          translateY.setValue(
            next >= 0 ? next : rubberband(next, heightRef.current),
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          const height = heightRef.current || screenHeight;
          const current = dragOrigin.current + gesture.dy;
          const velocity = panVelocityToSpring(gesture.vy);
          // Where momentum would carry it, not where the finger stopped.
          const projected = current + project(velocity);

          if (gesture.vy > FLICK_VELOCITY || projected > height * DISMISS_FRACTION) {
            requestClose();
            return;
          }
          // Settling back after a real drag, so a little overshoot is earned.
          Animated.spring(translateY, {
            toValue: 0,
            ...springConfig(SPRING.momentum),
            velocity,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            ...springConfig(SPRING.default),
          }).start();
        },
      }),
    [requestClose, screenHeight, translateY],
  );

  // Dragging only makes sense when the sheet can actually leave, and when
  // motion is allowed at all.
  const dragEnabled = dismissable && !reduceMotion;

  const scrimOpacity = reduceMotion
    ? fade
    : Animated.multiply(
        fade,
        translateY.interpolate({
          inputRange: [0, Math.max(1, sheetHeight)],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
      );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      // The motion is ours, so the platform must not add its own on top.
      animationType="none"
      statusBarTranslucent
      // Android's back gesture. Left unhandled when the sheet is not
      // dismissable, so back cannot strand the user on an empty app.
      onRequestClose={dismissable ? requestClose : undefined}>
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.scrim,
            { opacity: scrimOpacity },
          ]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissable ? requestClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close"
            // Already reachable via the close button and the back gesture;
            // announcing a full-screen target would only add noise.
            importantForAccessibility="no"
          />
        </Animated.View>

        <Animated.View
          onLayout={event => {
            const next = event.nativeEvent.layout.height;
            heightRef.current = next;
            // Only re-render when it actually moves; layout fires on every
            // content change and the scrim range does not need sub-pixel
            // precision.
            setSheetHeight(previous => (Math.abs(previous - next) > 1 ? next : previous));
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
              opacity: reduceMotion ? fade : 1,
            },
            contentStyle,
          ]}
          accessibilityViewIsModal
          {...(dragEnabled ? panResponder.panHandlers : null)}>
          {/* Grabber. Purely a visual affordance — the whole sheet drags. */}
          {dragEnabled ? (
            <View
              style={[styles.grabber, { backgroundColor: withAlpha(colors.text, 0.25) }]}
              importantForAccessibility="no"
            />
          ) : null}

          {title || headerRight ? (
            <View style={styles.header}>
              {title ? (
                <Text
                  accessibilityRole="header"
                  style={[typeScale.title3, styles.title, { color: colors.text }]}>
                  {title}
                </Text>
              ) : (
                <View style={styles.title} />
              )}
              {headerRight ??
                (dismissable ? (
                  <Touchable label="Close" onPress={requestClose} scaleTo={0.9}>
                    <Text style={[typeScale.bodyStrong, { color: colors.textMuted }]}>Done</Text>
                  </Touchable>
                ) : null)}
            </View>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    // Dim to focus: this is a modal task, so the background is pushed back
    // rather than left competing (SKILL §12).
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
  },
});
