import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useTheme } from '@/theme';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import { radius, space } from '@/theme/tokens';
import type { QuickPrompt } from '@/lib/quickPrompts';

/**
 * The `/` command menu, floating above the composer.
 *
 * Absolutely positioned rather than laid out above the input, so opening it
 * does not push the transcript up. A menu that shoves the conversation around
 * every time a slash is typed is worse than no menu — the thing you were
 * reading moves while you are reading it.
 *
 * It grows from its bottom edge, which is where it comes from: the composer.
 * A popover that expands from its centre or drops from the top reads as
 * unrelated to the control that opened it (apple-design §7 — motion should say
 * where something came from).
 */
export function SlashMenu({
  items,
  query,
  onPick,
}: {
  items: QuickPrompt[];
  query: string;
  onPick: (item: QuickPrompt) => void;
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
      // 160ms: a menu opened by typing has to be there by the time the eye
      // arrives, and this one is opened often enough that anything slower
      // would start to feel like waiting.
      duration: DURATION.fast,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.cardElevated,
          borderColor: colors.border,
          opacity: enter,
          transform: reduceMotion
            ? []
            : [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                // Never from 0: a menu that materialises out of nothing reads
                // as a glitch rather than as something opening.
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
        },
      ]}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No command matches “/{query}”
          </Text>
        </View>
      ) : (
        items.map((item, i) => (
          <Touchable
            key={item.key}
            onPress={() => onPick(item)}
            label={item.label}
            hint={item.desc}
            scale={false}
            dim
            style={[
              styles.row,
              i > 0 ? { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth } : null,
            ]}>
            <Text style={[styles.command, { color: colors.accent }]}>/{item.command}</Text>
            <View style={styles.rowBody}>
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={1}>
                {item.desc}
              </Text>
            </View>
          </Touchable>
        ))
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: space.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  command: {
    fontSize: 12,
    fontWeight: '700',
    width: 74,
  },
  rowBody: {
    flex: 1,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  desc: {
    fontSize: 11.5,
  },
  empty: {
    paddingHorizontal: space.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
