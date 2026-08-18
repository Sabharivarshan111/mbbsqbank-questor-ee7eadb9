import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Sheet } from '@/components/Sheet';
import { AccentPicker, ThemePreview } from '@/components/AccentPicker';
import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { useTheme, type ThemePreference } from '@/theme';
import { radius, space } from '@/theme/tokens';

/**
 * Appearance, in one place.
 *
 * Replaces a header button that toggled light/dark on tap. That was the right
 * control while a theme *was* a binary; with an accent to choose as well, a
 * button that silently flips one of several dimensions is the wrong
 * affordance, and an accent nobody can find is an accent nobody has.
 *
 * The cost is one extra tap to switch mode, so mode is the first row and the
 * sheet opens directly onto it.
 *
 * Two choices, not four. The reference this was adapted from offers
 * background, text, accent and card as free colour pickers with a live preview
 * to check the result — which makes legibility the user's problem, and offers
 * them a preview that cannot show the one screen where their pick fails. Base
 * plus accent covers the same ground with every combination readable by
 * construction. See theme/accents.ts.
 */

const MODES: { key: ThemePreference; label: string; hint: string }[] = [
  { key: 'dark', label: 'Dark', hint: 'Always dark' },
  { key: 'light', label: 'Light', hint: 'Always light' },
  { key: 'system', label: 'System', hint: 'Follows your phone' },
];

export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, preference, setPreference } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title="Appearance">
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Changes apply everywhere, straight away.
      </Text>

      <Text style={[styles.section, { color: colors.textMuted }]}>Mode</Text>
      <View style={styles.modeRow}>
        {MODES.map(mode => {
          const active = preference === mode.key;
          const Icon = mode.key === 'dark' ? Moon : mode.key === 'light' ? Sun : Smartphone;
          return (
            <Touchable
              key={mode.key}
              onPress={() => setPreference(mode.key)}
              role="radio"
              label={mode.label}
              hint={mode.hint}
              state={{ checked: active }}
              scaleTo={0.96}
              style={[
                styles.mode,
                {
                  backgroundColor: active ? colors.primary : colors.cardElevated,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}>
              <Icon size={16} color={active ? colors.primaryText : colors.text} />
              <Text
                style={[
                  styles.modeText,
                  { color: active ? colors.primaryText : colors.text },
                ]}>
                {mode.label}
              </Text>
            </Touchable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>Accent</Text>
      <AccentPicker />

      {/* The preview reads the live theme rather than a draft, so what is on
          screen is already the answer — there is nothing to "apply", and so no
          way to leave the sheet having changed something you did not want. */}
      <View style={styles.previewWrap}>
        <ThemePreview label="Preview" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontSize: 14,
    marginBottom: space.md,
  },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  mode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewWrap: {
    marginTop: space.md,
  },
});
