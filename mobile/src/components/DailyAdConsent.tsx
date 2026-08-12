import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme, withAlpha } from '@/theme';
import {
  confirmDailyAd,
  subscribeDailyAd,
  type DailyAdPrompt,
} from '@/lib/dailyAd';

/**
 * Port of src/components/DailyAdConsent.tsx — the app asks before playing the
 * once-a-day rewarded ad rather than interrupting without warning.
 */
export function DailyAdConsent() {
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState<DailyAdPrompt | null>(null);

  useEffect(() => subscribeDailyAd(setPrompt), []);

  const accept = () => {
    const current = prompt;
    setPrompt(null);
    if (current) {
      confirmDailyAd(current.reason).catch(() => undefined);
    }
  };

  return (
    <Modal
      visible={prompt !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setPrompt(null)}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha('#000000', 0.7) }]}>
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{prompt?.title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{prompt?.message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setPrompt(null)}
              style={[styles.secondary, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Not now</Text>
            </Pressable>
            <Pressable onPress={accept} style={[styles.primary, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryText, { color: colors.primaryText }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  secondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
