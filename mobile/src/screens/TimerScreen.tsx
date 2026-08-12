import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card, Muted, ProgressBar } from '@/components/ui';
import { formatClock, MODE_LABEL, PomodoroMode, usePomodoro } from '@/hooks/usePomodoro';

const MODES: PomodoroMode[] = ['focus', 'short', 'long'];
const DURATION_CHOICES = [15, 20, 25, 30, 45, 60];

export default function TimerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const timer = usePomodoro();

  const elapsed = timer.totalSeconds - timer.remaining;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Focus Timer</Text>

      <View style={styles.modeRow}>
        {MODES.map(mode => {
          const active = mode === timer.mode;
          return (
            <Pressable
              key={mode}
              onPress={() => timer.switchMode(mode)}
              style={[
                styles.modeChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}>
              <Text
                style={[
                  styles.modeText,
                  { color: active ? colors.primaryText : colors.textMuted },
                ]}>
                {MODE_LABEL[mode]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.clockCard}>
        <Text style={[styles.clock, { color: colors.text }]}>{formatClock(timer.remaining)}</Text>
        <Muted style={styles.clockLabel}>{timer.modeLabel}</Muted>
        <View style={styles.clockProgress}>
          <ProgressBar value={elapsed} total={timer.totalSeconds} />
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={timer.reset}
            style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <RotateCcw size={20} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={timer.isRunning ? timer.pause : timer.start}
            style={[styles.playButton, { backgroundColor: colors.primary }]}>
            {timer.isRunning ? (
              <Pause size={28} color={colors.primaryText} fill={colors.primaryText} />
            ) : (
              <Play size={28} color={colors.primaryText} fill={colors.primaryText} />
            )}
          </Pressable>

          <View style={styles.secondaryButtonSpacer} />
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.text }]}>{timer.completedFocus}</Text>
          <Muted>sessions today</Muted>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {timer.focusMinutesTotal}
          </Text>
          <Muted>minutes focused</Muted>
        </Card>
      </View>

      <Card style={styles.settingsCard}>
        <Text style={[styles.settingsTitle, { color: colors.text }]}>Focus length</Text>
        <View style={styles.durationRow}>
          {DURATION_CHOICES.map(minutes => {
            const active = timer.settings.focusMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                onPress={() => timer.updateSettings({ focusMinutes: minutes })}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: active ? colors.primary : colors.cardElevated,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.durationText,
                    { color: active ? colors.primaryText : colors.textMuted },
                  ]}>
                  {minutes}m
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Muted style={styles.settingsHint}>
          Breaks: {timer.settings.shortMinutes}m short, {timer.settings.longMinutes}m long every{' '}
          {timer.settings.longEvery} sessions. The countdown keeps running while the app is in the
          background.
        </Muted>
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clockCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  clock: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  clockLabel: {
    marginTop: 4,
  },
  clockProgress: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonSpacer: {
    width: 48,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  settingsCard: {
    marginTop: 16,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsHint: {
    marginTop: 12,
    lineHeight: 18,
  },
});
