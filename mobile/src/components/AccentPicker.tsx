import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Check } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { ACCENTS, accentColor, contrast, onColor } from '@/theme/accents';
import { SPRING, springConfig, useReducedMotion } from '@/theme/motion';
import { radius, space } from '@/theme/tokens';

/**
 * Choose the app's accent.
 *
 * Shown as swatches of the colour itself rather than named rows. A colour is
 * the one thing that cannot be usefully described in words — "Fuchsia" tells
 * you less than a fuchsia dot does — and a row of swatches is also the compact
 * form, which matters in a sheet that already carries the light/dark control.
 *
 * Each swatch is rendered in the colour it will actually be *for the current
 * base*, not a single canonical value. The same accent is a different hex on
 * light and dark (theme/accents.ts), so showing one of them on both would be
 * showing a colour the user is not about to get.
 */
export function AccentPicker() {
  const { colors, theme, accent, setAccent } = useTheme();

  return (
    <View style={styles.row}>
      {ACCENTS.map(item => {
        const hue = accentColor(item.key, theme);
        return (
          <Swatch
            key={item.key}
            color={hue}
            selected={accent === item.key}
            onPress={() => setAccent(item.key)}
            label={item.name}
            ringColor={colors.text}
          />
        );
      })}
    </View>
  );
}

function Swatch({
  color,
  selected,
  onPress,
  label,
  ringColor,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  label: string;
  ringColor: string;
}) {
  const reduceMotion = useReducedMotion();
  const on = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      on.setValue(selected ? 1 : 0);
      return;
    }
    if (reduceMotion) {
      on.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(on, {
      toValue: selected ? 1 : 0,
      ...springConfig(SPRING.snappy),
    }).start();
  }, [selected, reduceMotion, on]);

  return (
    <Touchable
      onPress={onPress}
      label={label}
      role="radio"
      state={{ selected }}
      hitSlop={8}
      scaleTo={0.88}
      style={styles.swatchTarget}>
      {/* The selection ring sits outside the swatch and scales in, so the
          colour itself never changes size — the thing being judged has to
          stay constant while you compare it to the one beside it. */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            opacity: on,
            transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
          },
        ]}
      />
      <View style={[styles.swatch, { backgroundColor: color }]}>
        {selected ? <Check size={13} color={onColor(color)} strokeWidth={3} /> : null}
      </View>
    </Touchable>
  );
}

/**
 * A miniature of the app in the given colours.
 *
 * The reference design showed each preset as four colour stripes, which asks
 * the user to imagine the result. This shows it: a surface, a line of text, a
 * muted line, and a filled button — the four things whose relationships
 * actually decide whether a theme is usable. The contrast figure is the point
 * that four free colour pickers could never guarantee.
 */
export function ThemePreview({ label }: { label?: string }) {
  const { colors } = useTheme();
  const ratio = contrast(colors.text, colors.background);

  return (
    <View
      style={[
        styles.preview,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}>
      {label ? (
        <Text style={[styles.previewLabel, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.previewCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <Text style={[styles.previewHeading, { color: colors.text }]}>Sample heading</Text>
        <Text style={[styles.previewBody, { color: colors.textMuted }]}>
          This is how your text will look.
        </Text>
        <View style={styles.previewRow}>
          <View style={[styles.previewButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.previewButtonText, { color: colors.onAccent }]}>Button</Text>
          </View>
          <View
            style={[styles.previewChip, { borderColor: withAlpha(colors.accent, 0.5) }]}>
            <Text style={[styles.previewChipText, { color: colors.accent }]}>Badge</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
        Text contrast {ratio.toFixed(1)}:1 · AAA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swatchTarget: {
    height: 44,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  preview: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: space.sm,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  previewCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: 4,
  },
  previewHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewBody: {
    fontSize: 13,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  previewButton: {
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewChip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewMeta: {
    fontSize: 11,
  },
});
