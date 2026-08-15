import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Sheet } from '@/components/Sheet';
import { ProgressRing } from '@/components/ProgressRing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Coffee, Pencil, Play, Pause, RotateCcw, SlidersHorizontal, Sparkles, Timer as TimerIcon, Users } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { formatClock, PomodoroMode, usePomodoro } from '@/hooks/usePomodoro';
import { formatFocusTime } from '@/lib/focusStats';

const MODES: { key: PomodoroMode; label: string; emoji: string }[] = [
  { key: 'focus', label: 'Focus', emoji: '🍅' },
  { key: 'short', label: 'Short break', emoji: '☕' },
  { key: 'long', label: 'Long break', emoji: '🌿' },
];

const DURATION_CHOICES = [15, 20, 25, 30, 45, 60, 90];

export default function TimerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const timer = usePomodoro();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeMode = MODES.find(m => m.key === timer.mode) ?? MODES[0];
  // How much of this session is still to come, for the dial ring.
  const remainingPercent =
    timer.totalSeconds > 0 ? (timer.remaining / timer.totalSeconds) * 100 : 100;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Focus Timer</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Deep work session</Text>
        </View>
        <Touchable
          onPress={() => setSettingsOpen(true)}
          label="Timer settings"
          hint="Choose how long a focus session lasts"
          scaleTo={0.9}
          style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SlidersHorizontal size={18} color={colors.text} />
        </Touchable>
      </View>

      {/* Mode switcher */}
      <View
        style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MODES.map(mode => {
          const active = mode.key === timer.mode;
          return (
            <Touchable
              key={mode.key}
              onPress={() => timer.switchMode(mode.key)}
              role="tab"
              label={mode.label}
              state={{ selected: active }}
              scale={false}
              style={[styles.segmentItem, active && { backgroundColor: colors.primary }]}>
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.primaryText : colors.textMuted },
                ]}>
                {mode.emoji} {mode.label}
              </Text>
            </Touchable>
          );
        })}
      </View>

      {/* Dial */}
      <View style={styles.dialWrap}>
        {/* The published design's thick white ring, now carrying the session
            state: it starts full and drains as time is spent. At rest it looks
            exactly as it always has, so nothing about the identity changes —
            it just stops being decoration.

            The head dot is off, and the spring is off: on a value that already
            moves every second, a travelling dot reads as a second clock hand
            and a re-targeting spring never settles. */}
        <ProgressRing
          percent={remainingPercent}
          size={260}
          thickness={14}
          from={colors.primary}
          to={colors.primary}
          showDot={false}
          animate={false}
          trackColor={withAlpha(colors.primary, 0.16)}>
          <View style={styles.dial}>
            <Text style={[styles.dialKicker, { color: colors.textMuted }]}>
              {activeMode.emoji} {activeMode.label.toUpperCase()}
            </Text>
            <View style={styles.dialClockRow}>
              <Text
                accessibilityLiveRegion="none"
                style={[styles.dialClock, { color: colors.text }]}>
                {formatClock(timer.remaining)}
              </Text>
              <Touchable
                onPress={() => setSettingsOpen(true)}
                label="Set a custom focus length"
                scaleTo={0.85}
                hitSlop={14}>
                <Pencil size={16} color={colors.textMuted} />
              </Touchable>
            </View>
            <Text style={[styles.dialHint, { color: colors.textMuted }]}>
              Tap the number to set custom time
            </Text>
          </View>
        </ProgressRing>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Touchable
          onPress={timer.reset}
          label="Reset timer"
          scaleTo={0.9}
          style={[styles.sideButton, { borderColor: colors.border }]}>
          <RotateCcw size={20} color={colors.text} />
        </Touchable>

        <Touchable
          onPress={timer.isRunning ? timer.pause : timer.start}
          label={timer.isRunning ? 'Pause timer' : 'Start timer'}
          // The primary control gets a deeper press than the rest — the amount
          // of shrink is part of how important a button feels.
          scaleTo={0.93}
          style={[styles.playButton, { backgroundColor: colors.primary }]}>
          {timer.isRunning ? (
            <Pause size={30} color={colors.primaryText} fill={colors.primaryText} />
          ) : (
            <Play size={30} color={colors.primaryText} fill={colors.primaryText} />
          )}
        </Touchable>

        <Touchable
          onPress={() => timer.switchMode('short')}
          label="Take a short break"
          scaleTo={0.9}
          style={[styles.sideButton, { borderColor: colors.border }]}>
          <Coffee size={20} color={colors.text} />
        </Touchable>
      </View>

      {/* Presence */}
      <View
        style={[styles.presence, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.presenceIcon, { backgroundColor: colors.cardElevated }]}>
          <Users size={18} color={colors.text} />
        </View>
        <View style={styles.presenceBody}>
          <Text style={[styles.presenceLabel, { color: colors.textMuted }]}>
            Studying with you right now
          </Text>
          <Text style={[styles.presenceValue, { color: colors.text }]}>
            {timer.isRunning ? 'You are in a session' : 'Start a session to join'}
          </Text>
        </View>
        <View style={[styles.presenceDot, { backgroundColor: colors.green }]} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statHeader}>
            <TimerIcon size={14} color={colors.textMuted} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatFocusTime(timer.focusMinutesToday)}
          </Text>
          <Text style={[styles.statSub, { color: colors.textMuted }]}>
            Total: {formatFocusTime(timer.focusMinutesTotal)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statHeader}>
            <Sparkles size={14} color={colors.textMuted} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pomodoros</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{timer.completedFocus}</Text>
        </View>
      </View>

      <Sheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Focus length">
        <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
          Breaks: {timer.settings.shortMinutes}m short, {timer.settings.longMinutes}m long every{' '}
          {timer.settings.longEvery} sessions
        </Text>
        <View style={styles.durationGrid}>
          {DURATION_CHOICES.map(minutes => {
            const active = timer.settings.focusMinutes === minutes;
            return (
              <Touchable
                key={minutes}
                onPress={() => {
                  timer.updateSettings({ focusMinutes: minutes });
                  setSettingsOpen(false);
                }}
                role="radio"
                label={`${minutes} minutes`}
                state={{ checked: active }}
                scaleTo={0.94}
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
                    { color: active ? colors.primaryText : colors.text },
                  ]}>
                  {minutes}m
                </Text>
              </Touchable>
            );
          })}
        </View>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  iconCircle: {
    height: 44,
    width: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dialWrap: {
    alignItems: 'center',
    marginTop: 26,
  },
  dial: {
    height: 260,
    width: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    // The soft halo around the ring in the design.
    elevation: 12,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  dialKicker: {
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '600',
  },
  dialClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dialClock: {
    fontSize: 52,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  dialHint: {
    fontSize: 12,
    marginTop: 6,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: 26,
  },
  sideButton: {
    height: 56,
    width: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    height: 78,
    width: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 26,
  },
  presenceIcon: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceBody: {
    flex: 1,
  },
  presenceLabel: {
    fontSize: 13,
  },
  presenceValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  presenceDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  statSub: {
    fontSize: 12,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 13,
    marginTop: 4,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  durationText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
