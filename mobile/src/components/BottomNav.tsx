import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FileText, Home, Sparkles, Timer, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
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
 * Port of src/components/shell/BottomNav.tsx: five items with the Timer raised
 * into a floating disc in the middle.
 */
export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const activeKey = state.routes[state.index]?.name as TabKey | undefined;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
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
            <Pressable
              key={key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel="Timer"
              style={styles.centerItem}>
              <View
                style={[
                  styles.centerDisc,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                    transform: [{ scale: isActive ? 1.05 : 1 }],
                  },
                ]}>
                <Icon size={24} color={colors.primaryText} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={styles.item}>
            <Icon size={20} color={isActive ? colors.primary : colors.textMuted} />
            <Text
              style={[styles.label, { color: isActive ? colors.primary : colors.textMuted }]}>
              {label}
            </Text>
          </Pressable>
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
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
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
