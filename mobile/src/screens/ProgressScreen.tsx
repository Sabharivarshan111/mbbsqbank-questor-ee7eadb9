import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, RefreshCw, Sun, Smartphone } from 'lucide-react-native';
import { useTheme, type ThemePreference } from '@/theme';
import { Card, Muted, ProgressBar, SectionTitle } from '@/components/ui';
import {
  collectAllQuestions,
  getSubjects,
  SUBJECT_ICON,
  YEAR_KEYS,
  YEAR_LABEL,
} from '@/lib/questionBank';
import { reconcileProgress, totalDone } from '@/lib/progress';
import { useCountDone } from '@/hooks/useProgress';
import { loadProfile, Profile } from '@/lib/profile';

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <Sun size={15} /> },
  { key: 'dark', label: 'Dark', icon: <Moon size={15} /> },
  { key: 'system', label: 'System', icon: <Smartphone size={15} /> },
];

export default function ProgressScreen() {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const countDone = useCountDone();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const year = profile?.year ?? 'second-year';

  const perYear = useMemo(
    () =>
      YEAR_KEYS.map(key => {
        const questions = getSubjects(key).flatMap(subject => collectAllQuestions(subject.node));
        const unique = Array.from(new Set(questions));
        return {
          key,
          label: YEAR_LABEL[key],
          total: unique.length,
          done: countDone(unique),
        };
      }),
    [countDone],
  );

  const currentYearSubjects = useMemo(
    () =>
      getSubjects(year).map(subject => {
        const all = collectAllQuestions(subject.node);
        return { ...subject, total: all.length, done: countDone(all) };
      }),
    [year, countDone],
  );

  const grandTotal = useMemo(
    () =>
      perYear.reduce(
        (acc, item) => ({ done: acc.done + item.done, total: acc.total + item.total }),
        { done: 0, total: 0 },
      ),
    [perYear],
  );

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await reconcileProgress();
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.title, { color: colors.text }]}>My Progress</Text>

      <Card style={styles.xpCard}>
        <Text style={[styles.xpValue, { color: colors.primary }]}>{totalDone()}</Text>
        <Muted>questions completed</Muted>
        <View style={styles.xpBar}>
          <ProgressBar value={grandTotal.done} total={grandTotal.total} />
        </View>
        <Muted style={styles.xpFoot}>
          {grandTotal.done} of {grandTotal.total} across all four years
        </Muted>
      </Card>

      <SectionTitle style={styles.sectionSpacer}>By year</SectionTitle>
      {perYear.map(item => (
        <Card key={item.key} style={styles.rowCard}>
          <View style={styles.rowHeader}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
            <Muted>
              {item.done} / {item.total}
            </Muted>
          </View>
          <ProgressBar value={item.done} total={item.total} />
        </Card>
      ))}

      <SectionTitle style={styles.sectionSpacer}>{YEAR_LABEL[year]} subjects</SectionTitle>
      {currentYearSubjects.map(subject => (
        <Card key={subject.key} style={styles.rowCard}>
          <View style={styles.rowHeader}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {SUBJECT_ICON[subject.key] ?? '📘'} {subject.name}
            </Text>
            <Muted>
              {subject.done} / {subject.total}
            </Muted>
          </View>
          <ProgressBar value={subject.done} total={subject.total} />
        </Card>
      ))}

      <SectionTitle style={styles.sectionSpacer}>Settings</SectionTitle>
      <Card>
        <Text style={[styles.settingLabel, { color: colors.text }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(option => {
            const active = option.key === preference;
            return (
              <Pressable
                key={option.key}
                onPress={() => setPreference(option.key)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.cardElevated,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.themeText,
                    { color: active ? colors.primaryText : colors.textMuted },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={sync}
          style={[styles.syncRow, { borderTopColor: colors.border }]}
          disabled={syncing}>
          <RefreshCw size={16} color={colors.accent} />
          <View style={styles.syncBody}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {syncing ? 'Syncing…' : 'Sync progress'}
            </Text>
            <Muted>Merge this device with your cloud progress</Muted>
          </View>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  xpCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  xpValue: {
    fontSize: 44,
    fontWeight: '800',
  },
  xpBar: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  xpFoot: {
    marginTop: 8,
  },
  sectionSpacer: {
    marginTop: 22,
  },
  rowCard: {
    marginBottom: 8,
    paddingVertical: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  themeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  syncBody: {
    flex: 1,
  },
});
