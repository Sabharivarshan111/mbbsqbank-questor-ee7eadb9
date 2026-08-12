import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { GradientFill } from '@/components/Gradient';
import { useTheme, withAlpha } from '@/theme';
import { DisplayNameError, type LocalProfile, type Year } from '@/lib/profile';
import { YEAR_LABEL } from '@/lib/questionBank';
import { YEAR_TO_KEY } from '@/lib/profile';

const YEARS: Year[] = ['first', 'second', 'third', 'final'];

/**
 * Name + year editor, also used as first-run onboarding. The name goes through
 * the same blocklist the web app uses (shared, not duplicated).
 */
export function ProfileSheet({
  visible,
  profile,
  onClose,
  onSave,
  dismissable = true,
}: {
  visible: boolean;
  profile: LocalProfile | null;
  onClose: () => void;
  onSave: (next: LocalProfile) => Promise<void>;
  dismissable?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [year, setYear] = useState<Year>('second');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile?.display_name ?? '');
      setYear(profile?.year ?? 'second');
      setError(null);
    }
  }, [visible, profile]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ display_name: name, year });
      onClose();
    } catch (err) {
      setError(
        err instanceof DisplayNameError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not save your profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismissable ? onClose : undefined}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: withAlpha('#000000', 0.7) }]}
        onPress={dismissable ? onClose : undefined}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 20,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              {profile ? 'Edit profile' : 'Welcome to Orbit'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {profile
                ? 'Your name appears on the leaderboard.'
                : 'Pick a name and your year to get started.'}
            </Text>
          </View>
          {dismissable ? (
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>DISPLAY NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Phantom"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          autoCorrect={false}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.cardElevated,
              borderColor: error ? colors.danger : colors.border,
            },
          ]}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>YEAR</Text>
        <View style={styles.grid}>
          {YEARS.map(option => {
            const active = option === year;
            return (
              <Pressable
                key={option}
                onPress={() => setYear(option)}
                style={[
                  styles.yearCard,
                  {
                    backgroundColor: colors.cardElevated,
                    borderColor: active ? colors.text : colors.border,
                    borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}>
                <Text style={[styles.yearName, { color: colors.text }]}>
                  {YEAR_LABEL[YEAR_TO_KEY[option]]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={saving}
          style={({ pressed }) => [styles.saveButton, { opacity: pressed || saving ? 0.85 : 1 }]}>
          <GradientFill from="#FFFFFF" to={colors.fuchsia} borderRadius={14} />
          {saving ? (
            <ActivityIndicator color="#1A0A1F" />
          ) : (
            <Text style={styles.saveText}>{profile ? 'Save' : 'Start studying'}</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  yearCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  yearName: {
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    marginTop: 14,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 20,
  },
  saveText: {
    color: '#1A0A1F',
    fontSize: 17,
    fontWeight: '800',
  },
});
