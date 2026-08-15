import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useTheme } from '@/theme';
import { typeScale } from '@/theme/typography';
import { DURATION, EASE, SPRING, springConfig, useReducedMotion } from '@/theme/motion';

export function Card({
  children,
  style,
  onPress,
  label,
  hint,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  /** Required once the card is tappable — TalkBack has nothing else to read. */
  label?: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }
  return (
    <Touchable
      onPress={onPress}
      label={label ?? 'Open'}
      hint={hint}
      // Large surfaces need less shrink than small ones to read as the same
      // amount of press.
      scaleTo={0.985}
      style={cardStyle}>
      {children}
    </Touchable>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[typeScale.title3, styles.sectionTitle, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[typeScale.footnote, { color: colors.textMuted }, style]}>{children}</Text>;
}

/**
 * Progress bars grow to their value rather than jumping.
 *
 * The fill is laid out at full width and squeezed with `scaleX` from its left
 * edge, rather than having its `width` animated. Width is a layout property:
 * animating it forces layout + paint + composite every frame, on the JS
 * thread, for every bar on screen. `scaleX` is a transform, so it composites
 * on the GPU and runs on the native driver — the difference between a smooth
 * bar and a stuttering one on a cheap phone.
 *
 * Timing rather than a spring: several bars can animate at once, and overshoot
 * on a measurement reads as an error, not as physics.
 */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  const scale = useRef(new Animated.Value(pct / 100)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current || reduceMotion) {
      firstRun.current = false;
      scale.setValue(pct / 100);
      return;
    }
    Animated.timing(scale, {
      toValue: pct / 100,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [pct, reduceMotion, scale]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.primary,
            // Anchored left, so the bar grows from its start rather than from
            // its middle.
            transformOrigin: 'left',
            transform: [{ scaleX: scale }],
          },
        ]}
      />
    </View>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
}) {
  const { colors } = useTheme();
  const toneColor = {
    neutral: colors.textMuted,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  return (
    <View style={[styles.pill, { borderColor: toneColor }]}>
      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

/**
 * Segmented control. The selection indicator slides between segments on a
 * spring instead of the highlight teleporting — the movement is what tells
 * you which way you just travelled (SKILL §8, hint in the direction of the
 * change).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = React.useState(0);

  const index = Math.max(
    0,
    options.findIndex(option => option.key === value),
  );
  const slot = useRef(new Animated.Value(index)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current || reduceMotion) {
      firstRun.current = false;
      slot.setValue(index);
      return;
    }
    Animated.spring(slot, { toValue: index, ...springConfig(SPRING.default) }).start();
  }, [index, reduceMotion, slot]);

  const count = Math.max(1, options.length);
  // 3dp padding each side, 3dp gaps between segments.
  const innerWidth = Math.max(0, trackWidth - 6 - 3 * (count - 1));
  const segmentWidth = innerWidth / count;

  return (
    <View
      onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
      style={[
        styles.segment,
        { backgroundColor: colors.cardElevated, borderColor: colors.border },
      ]}>
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentIndicator,
            {
              backgroundColor: colors.primary,
              width: segmentWidth,
              transform: [
                {
                  translateX: slot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, segmentWidth + 3],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {options.map(option => {
        const active = option.key === value;
        return (
          <Touchable
            key={option.key}
            onPress={() => onChange(option.key)}
            role="tab"
            label={option.label}
            state={{ selected: active }}
            scale={false}
            style={styles.segmentItem}>
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.primaryText : colors.textMuted },
              ]}>
              {option.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <Touchable
      onPress={onPress}
      label={label}
      hint={hint}
      disabled={disabled || loading}
      state={{ busy: loading }}
      style={[styles.button, { backgroundColor: colors.primary }, style]}>
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <Text style={[typeScale.bodyStrong, { color: colors.primaryText }]}>{label}</Text>
      )}
    </Touchable>
  );
}

/**
 * Empty states answer "what's here and what do I do" rather than just
 * reporting absence (SKILL §16 Wayfinding). `action` gives the user a way out
 * instead of a dead end.
 */
export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      <Text style={[typeScale.title3, styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Muted style={styles.emptySubtitle}>{subtitle}</Muted> : null}
      {action ? (
        <Touchable
          onPress={action.onPress}
          label={action.label}
          style={[styles.emptyAction, { borderColor: colors.border }]}>
          <Text style={[typeScale.bodyStrong, { color: colors.text }]}>{action.label}</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    // Full width in layout; scaleX does the work.
    width: '100%',
    borderRadius: 3,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 9,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: 'center',
  },
});
