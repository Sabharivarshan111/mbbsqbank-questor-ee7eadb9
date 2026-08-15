import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useTheme } from '@/theme';
import { typeScale } from '@/theme/typography';
import { DURATION, EASE, SPRING, springConfig, useReducedMotion } from '@/theme/motion';

/**
 * Centred dialog for decisions the user has to answer before continuing.
 *
 * It *materialises* rather than fading: scale and opacity animate together, so
 * the surface reads as arriving rather than as a picture being turned up
 * (SKILL §12). Scale starts at 0.92 — small enough to read as movement, large
 * enough that the text never looks like it is being zoomed.
 *
 * Reserved for genuine either/or moments. A dialog interrupts, and interrupting
 * for things that are not decisions trains people to dismiss without reading
 * (SKILL §16 Agency).
 */

export interface DialogAction {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
}

export function Dialog({
  visible,
  onDismiss,
  title,
  message,
  actions,
}: {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  actions: DialogAction[];
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scale.setValue(reduceMotion ? 1 : 0.92);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: DURATION.fast,
          easing: EASE.out,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, ...springConfig(SPRING.default) }),
      ]).start();
      return;
    }
    if (!mounted) {
      return;
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }),
      // Leaves the way it came — shrinking back to where it grew from, not
      // sliding off somewhere it never was (SKILL §7).
      Animated.timing(scale, {
        toValue: reduceMotion ? 1 : 0.96,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
    // `mounted` flips at the end of this same animation; depending on it would
    // restart the exit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const run = useCallback((action: DialogAction) => {
    action.onPress();
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            importantForAccessibility="no"
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fade,
              transform: [{ scale }],
            },
          ]}>
          {title ? (
            <Text
              accessibilityRole="header"
              style={[typeScale.title2, { color: colors.text }]}>
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text style={[typeScale.callout, styles.message, { color: colors.textMuted }]}>
              {message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {actions.map(action => {
              const isPrimary = (action.tone ?? 'primary') === 'primary';
              const isDanger = action.tone === 'danger';
              return (
                <Touchable
                  key={action.label}
                  onPress={() => run(action)}
                  label={action.label}
                  style={[
                    styles.action,
                    isPrimary
                      ? { backgroundColor: colors.primary }
                      : {
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: isDanger ? colors.danger : colors.border,
                        },
                  ]}>
                  <Text
                    style={[
                      typeScale.bodyStrong,
                      {
                        color: isPrimary
                          ? colors.primaryText
                          : isDanger
                          ? colors.danger
                          : colors.textMuted,
                      },
                    ]}>
                    {action.label}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  message: {
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  action: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
