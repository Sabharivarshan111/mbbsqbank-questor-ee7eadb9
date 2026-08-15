import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FileText, Home, Sparkles, Timer, User } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { SPRING, springConfig, useReducedMotion } from '@/theme/motion';
import type { RootTabParamList } from '@/navigation/types';

type TabKey = keyof RootTabParamList;

const ITEMS: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: 'Home', label: 'Home', Icon: Home },
  { key: 'Notes', label: 'Notes', Icon: FileText },
  { key: 'Timer', label: 'Timer', Icon: Timer },
  { key: 'AskAI', label: 'Ask AI', Icon: Sparkles },
  { key: 'Progress', label: 'My Progress', Icon: User },
];

/**
 * Selection indicator for one tab. Springs in rather than switching, so the
 * eye can follow which tab took focus.
 */
function TabIndicator({ active, color }: { active: boolean; color: string }) {
  const reduceMotion = useReducedMotion();
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(value, {
      toValue: active ? 1 : 0,
      ...springConfig(SPRING.snappy),
    }).start();
  }, [active, reduceMotion, value]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.indicator,
        {
          backgroundColor: color,
          opacity: value,
          // From 0.4, not 0 — see QuestionRow for why nothing scales from zero.
          transform: [
            { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          ],
        },
      ]}
    />
  );
}

/**
 * Port of src/components/shell/BottomNav.tsx: five items with the Timer raised
 * into a floating disc in the middle.
 *
 * Two design-skill notes:
 *   • The bar is the app's persistent chrome, so it carries a bright hairline
 *     top edge — the cue that reads as "a layer floating above the content"
 *     (SKILL §12). Real backdrop blur would need a native module; see
 *     .claude/skills/apple-design/README.md for why that was not taken.
 *   • The labels are the contents' names — "Progress", "Notes", "Timer" —
 *     not generic umbrellas, which is what makes the destinations predictable
 *     (SKILL §16).
 */
export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const activeKey = state.routes[state.index]?.name as TabKey | undefined;

  const discScale = useRef(new Animated.Value(activeKey === 'Timer' ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      discScale.setValue(activeKey === 'Timer' ? 1 : 0);
      return;
    }
    Animated.spring(discScale, {
      toValue: activeKey === 'Timer' ? 1 : 0,
      ...springConfig(SPRING.momentum),
    }).start();
  }, [activeKey, discScale, reduceMotion]);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: withAlpha(colors.text, 0.14),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}>
      {ITEMS.map(({ key, label, Icon }) => {
        const isActive = activeKey === key;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find(route => route.name === key)?.key ?? '',
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(key);
          }
        };

        if (key === 'Timer') {
          return (
            <Touchable
              key={key}
              onPress={onPress}
              role="tab"
              label="Timer"
              state={{ selected: isActive }}
              scaleTo={0.92}
              style={styles.centerItem}>
              <Animated.View
                style={[
                  styles.centerDisc,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                    transform: [
                      {
                        scale: discScale.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.06],
                        }),
                      },
                    ],
                  },
                ]}>
                <Icon size={24} color={colors.primaryText} />
              </Animated.View>
            </Touchable>
          );
        }

        return (
          <Touchable
            key={key}
            onPress={onPress}
            role="tab"
            label={label}
            state={{ selected: isActive }}
            scaleTo={0.9}
            style={styles.item}>
            <Icon size={20} color={isActive ? colors.primary : colors.textMuted} />
            <Text style={[styles.label, { color: isActive ? colors.primary : colors.textMuted }]}>
              {label}
            </Text>
            <TabIndicator active={isActive} color={colors.primary} />
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    // Keeps every tab at the 44dp touch minimum even at the smallest font
    // scale.
    minHeight: 48,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  centerDisc: {
    height: 56,
    width: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches the web shadow-lg on the raised button.
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
