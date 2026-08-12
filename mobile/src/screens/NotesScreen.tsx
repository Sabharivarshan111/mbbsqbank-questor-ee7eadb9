import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FolderOpen, Lock, MessageCircle, PenLine } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { loadProfile, type Profile } from '@/lib/profile';
import { YEAR_LABEL } from '@/lib/questionBank';

/** Port of src/components/shell/NotesTab.tsx. */
export default function NotesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const year = profile?.year ?? 'second-year';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Notes</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        AI-generated handwritten notes for every topic
      </Text>

      <View style={[styles.hub, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.hubIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
          <PenLine size={26} color={colors.primary} />
        </View>
        <Text style={[styles.hubTitle, { color: colors.text }]}>Handwritten notes</Text>
        <Text style={[styles.hubBody, { color: colors.textMuted }]}>
          Open any question and tap the sparkle to generate notes for that topic. Saved notes
          appear here.
        </Text>
      </View>

      <View style={[styles.locked, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.lockIcon, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
          <Lock size={28} color={colors.textMuted} />
        </View>
        <Text style={[styles.lockedTitle, { color: colors.text }]}>Study Materials</Text>
        <Text style={[styles.lockedBody, { color: colors.textMuted }]}>
          Currently locked while we sort out copyright clearances.
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: withAlpha(colors.primary, 0.1),
              borderColor: withAlpha(colors.primary, 0.3),
            },
          ]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            New study material coming soon
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => Linking.openURL('https://drive.google.com/').catch(() => {})}
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.linkIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
          <FolderOpen size={16} color={colors.primary} />
        </View>
        <View style={styles.linkBody}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>Drive folder</Text>
          <Text style={[styles.linkSub, { color: colors.textMuted }]}>
            MCQs, previous year papers & predicted papers
          </Text>
        </View>
        <Text style={[styles.linkAction, { color: colors.primary }]}>Open</Text>
      </Pressable>

      <Pressable
        onPress={() => Linking.openURL('https://chat.whatsapp.com/').catch(() => {})}
        style={[
          styles.linkCard,
          {
            backgroundColor: withAlpha(colors.green, 0.05),
            borderColor: withAlpha(colors.green, 0.3),
          },
        ]}>
        <View style={[styles.linkIcon, { backgroundColor: withAlpha(colors.green, 0.15) }]}>
          <MessageCircle size={16} color={colors.green} />
        </View>
        <View style={styles.linkBody}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>
            Join our WhatsApp community
          </Text>
          <Text style={[styles.linkSub, { color: colors.textMuted }]}>
            {YEAR_LABEL[year]} materials, notes & updates
          </Text>
        </View>
        <Text style={[styles.linkAction, { color: colors.green }]}>Join</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  hub: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  hubIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hubTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  hubBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  locked: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  lockIcon: {
    height: 64,
    width: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  lockedBody: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  badge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  linkIcon: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkSub: {
    fontSize: 11,
    marginTop: 2,
  },
  linkAction: {
    fontSize: 12,
    fontWeight: '700',
  },
});
