import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme';

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) {
    return body;
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {body}
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.text }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[styles.muted, { color: colors.textMuted }, style]}>{children}</Text>;
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
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
  return (
    <View style={[styles.segment, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
      {options.map(option => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.segmentItem,
              active && { backgroundColor: colors.primary },
            ]}>
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.primaryText : colors.textMuted },
              ]}>
              {option.label}
            </Text>
          </Pressable>
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Muted style={styles.emptySubtitle}>{subtitle}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    textAlign: 'center',
  },
});
