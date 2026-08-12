import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MessageCircle, Sparkles, TriangleAlert } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { GradientFill } from '@/components/Gradient';
import { loadProfile, type Profile } from '@/lib/profile';
import { YEAR_KEYS, YEAR_LABEL, type YearKey } from '@/lib/questionBank';
import type { RootTabParamList } from '@/navigation/types';

const YEAR_EMOJI: Record<YearKey, string> = {
  'first-year': '🩺',
  'second-year': '💊',
  'third-year': '⚖️',
  'final-year': '🏥',
};

/** Port of src/components/shell/NotesTab.tsx. */
export default function NotesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const year = profile?.year ?? 'second-year';

  const openYear = useCallback(
    (key: YearKey) => {
      navigation.navigate('Home', { screen: 'BrowseHome', params: { year: key } });
    },
    [navigation],
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Notes</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        AI-generated handwritten notes for every topic
      </Text>

      {/* AI hero */}
      <View style={styles.hero}>
        <GradientFill from="#1E40AF" to="#3B82F6" borderRadius={18} />
        <View style={styles.heroKickerRow}>
          <Sparkles size={16} color="#FFFFFF" />
          <Text style={styles.heroKicker}>AI GENERATED</Text>
        </View>
        <Text style={styles.heroTitle}>Handwritten Notes</Text>
        <Text style={styles.heroBody}>
          Pick a year → subject → topic. We synthesize an exam-ready page from every essay &
          short-note in that topic.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT YEAR</Text>
      <View style={styles.yearGrid}>
        {YEAR_KEYS.map(key => (
          <Pressable
            key={key}
            onPress={() => openYear(key)}
            style={({ pressed }) => [
              styles.yearCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={styles.yearEmoji}>{YEAR_EMOJI[key]}</Text>
            <Text style={[styles.yearName, { color: colors.text }]}>{YEAR_LABEL[key]}</Text>
            <Text style={[styles.yearHint, { color: colors.textMuted }]}>
              Tap to browse subjects
            </Text>
          </Pressable>
        ))}
      </View>

      {/* WhatsApp group */}
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.groupHeader}>
          <View style={[styles.groupIcon, { backgroundColor: withAlpha(colors.green, 0.15) }]}>
            <MessageCircle size={18} color={colors.green} />
          </View>
          <View style={styles.groupBody}>
            <Text style={[styles.groupTitle, { color: colors.text }]}>
              WhatsApp group for {YEAR_LABEL[year].toLowerCase()}
            </Text>
            <Text style={[styles.groupSub, { color: colors.textMuted }]}>
              Join our WhatsApp group for {YEAR_LABEL[year].toLowerCase()} study materials, notes
              and exam updates.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => Linking.openURL('https://chat.whatsapp.com/').catch(() => {})}
          style={({ pressed }) => [styles.joinButton, { opacity: pressed ? 0.85 : 1 }]}>
          <GradientFill from="#22C55E" to="#16A34A" borderRadius={12} />
          <Text style={styles.joinText}>Tap here to join our WhatsApp group</Text>
        </Pressable>

        <View
          style={[
            styles.warning,
            {
              backgroundColor: withAlpha(colors.warning, 0.08),
              borderColor: withAlpha(colors.warning, 0.4),
            },
          ]}>
          <TriangleAlert size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            You must be using the ORBIT MBBS app downloaded from the Play Store, on the latest
            version, to join. Search "Orbit MBBS" on the Play Store and install or update it.
            Older or illegitimate versions will not be allowed.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
    marginBottom: 16,
  },
  hero: {
    borderRadius: 18,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 22,
  },
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroKicker: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 10,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 12,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  yearCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  yearEmoji: {
    fontSize: 34,
    marginBottom: 12,
  },
  yearName: {
    fontSize: 17,
    fontWeight: '700',
  },
  yearHint: {
    fontSize: 13,
    marginTop: 2,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  groupIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBody: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  groupSub: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 16,
  },
  joinText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
