import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Palette, Sun } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import { PRESETS, type CustomPalette, type PresetKey } from '@/theme/presets';
import { radius, space } from '@/theme/tokens';

/**
 * The theme menu, anchored under the header button that opens it.
 *
 * A dropdown rather than a bottom sheet, matching the published app. The
 * distinction is not cosmetic: a menu belongs to the control that opened it
 * and grows from it, which is why it is positioned against the button's
 * measured frame and scales from its top-right corner. A sheet arrives from
 * the bottom of the screen and belongs to the screen — right for a task, wrong
 * for a short list of choices attached to a specific button.
 */

/** Where the anchor button is, in window coordinates. */
export interface Anchor {
  top: number;
  right: number;
}

const WIDTH = 232;

/** A theme's mark: a circle in its own colours, so the row shows the theme. */
function Mark({ palette }: { palette: CustomPalette }) {
  return (
    <View style={[styles.mark, { backgroundColor: palette.background, borderColor: palette.card }]}>
      <View style={[styles.markInner, { backgroundColor: palette.accent }]} />
    </View>
  );
}

export function ThemeMenu({
  visible,
  anchor,
  onClose,
  onCreate,
}: {
  visible: boolean;
  anchor: Anchor | null;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { colors, preference, setPreference, custom } = useTheme();
  const reduceMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      // A menu is opened often and read immediately; it has to be there by the
      // time the eye arrives.
      duration: DURATION.fast,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, enter]);

  const pick = (key: PresetKey) => {
    setPreference(key);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Tapping anywhere outside closes, the way a menu does. Unlabelled and
          unannounced: the same action is the back gesture, and a full-screen
          target called "Close" would be noise in the reading order. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            top: anchor?.top ?? 80,
            right: anchor?.right ?? 16,
            opacity: enter,
            transform: reduceMotion
              ? []
              : [
                  // Grows from the corner nearest the button, so it reads as
                  // coming out of the control rather than appearing beside it.
                  { translateX: WIDTH / 2 },
                  { translateY: -8 },
                  { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  { translateY: 8 },
                  { translateX: -WIDTH / 2 },
                ],
          },
        ]}>
        {PRESETS.map(preset => (
          <Row
            key={preset.key}
            label={preset.name}
            active={preference === preset.key}
            onPress={() => pick(preset.key)}
            icon={
              preset.key === 'light' ? (
                <Sun size={17} color={colors.text} />
              ) : (
                <Mark palette={preset.palette!} />
              )
            }
          />
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {custom ? (
          <Row
            label="My Theme"
            active={preference === 'custom'}
            onPress={() => pick('custom')}
            icon={<Mark palette={custom} />}
          />
        ) : null}

        <Row
          label={custom ? 'Edit My Theme…' : 'Create Your Own…'}
          onPress={() => {
            onClose();
            onCreate();
          }}
          icon={<Palette size={17} color={colors.text} />}
        />
      </Animated.View>
    </Modal>
  );
}

function Row({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Touchable
      onPress={onPress}
      role="menuitem"
      label={label}
      state={{ selected: !!active }}
      scale={false}
      dim
      style={styles.row}>
      <View style={styles.icon}>{icon}</View>
      {/* The active theme is bold rather than ticked, as in the published
          menu: with a coloured mark already on every row, a tick beside one of
          them is a second thing to read for the same fact. */}
      <Text style={[styles.label, { color: colors.text, fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    width: WIDTH,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    // Menus float above the page; without a shadow the panel reads as part of
    // whatever is behind it.
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: space.md,
    gap: space.md,
  },
  icon: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
  },
  mark: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInner: {
    height: 9,
    width: 9,
    borderRadius: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.sm,
  },
});
