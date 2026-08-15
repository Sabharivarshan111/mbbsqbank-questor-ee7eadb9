import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Text';
import { Sheet } from '@/components/Sheet';
import { Touchable } from '@/components/Touchable';
import { GradientFill } from '@/components/Gradient';
import { useTheme } from '@/theme';
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

  const isOnboarding = !profile;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      // First run has no "cancel": there is nothing behind it to go back to,
      // so no stray tap, swipe or back press may strand the user on an empty
      // app.
      dismissable={dismissable}
      title={isOnboarding ? 'Welcome to Orbit' : 'Edit profile'}>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {isOnboarding
          ? 'Pick a name and your year to get started.'
          : 'Your name appears on the leaderboard.'}
      </Text>

      <Text nativeID="profile-name-label" style={[styles.label, { color: colors.textMuted }]}>
        DISPLAY NAME
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Phantom"
        placeholderTextColor={colors.textMuted}
        maxLength={40}
        autoCorrect={false}
        accessibilityLabel="Display name"
        // Validation is announced inline, not saved up for the submit button
        // (SKILL §16 — validate inline, not on submit).
        accessibilityHint={error ?? undefined}
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
          const optionLabel = YEAR_LABEL[YEAR_TO_KEY[option]];
          return (
            <Touchable
              key={option}
              onPress={() => setYear(option)}
              role="radio"
              label={optionLabel}
              state={{ checked: active }}
              scaleTo={0.97}
              style={[
                styles.yearCard,
                {
                  backgroundColor: colors.cardElevated,
                  borderColor: active ? colors.text : colors.border,
                  borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}>
              <Text style={[styles.yearName, { color: colors.text }]}>{optionLabel}</Text>
            </Touchable>
          );
        })}
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}

      <Touchable
        onPress={submit}
        disabled={saving}
        state={{ busy: saving }}
        label={isOnboarding ? 'Start studying' : 'Save'}
        style={styles.saveButton}>
        <GradientFill from="#FFFFFF" to={colors.fuchsia} borderRadius={14} />
        {saving ? (
          <ActivityIndicator color="#1A0A1F" />
        ) : (
          <Text style={styles.saveText}>{isOnboarding ? 'Start studying' : 'Save'}</Text>
        )}
      </Touchable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
