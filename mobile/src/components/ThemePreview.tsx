import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme, withAlpha } from '@/theme';
import { contrast } from '@/theme/color';
import { paletteFrom, type CustomPalette } from '@/theme/presets';
import { radius, space } from '@/theme/tokens';

/**
 * A miniature of the app in a given set of colours.
 *
 * Shows the four relationships that decide whether a theme is usable — page,
 * card, body text, filled control — rather than the four swatches that were
 * chosen. Swatches tell you what you picked; this tells you what you get.
 *
 * The contrast figure is the part worth keeping. Four free colours can produce
 * unreadable text, and a preview alone leaves noticing that to the user; the
 * number says it outright, with a warning below the AA threshold.
 */
export function ThemePreview({
  palette,
  label = 'Live preview',
}: {
  /** Omit to preview the theme currently applied. */
  palette?: CustomPalette;
  label?: string;
}) {
  const theme = useTheme();
  const colors = palette ? paletteFrom(palette) : theme.colors;
  const ratio = contrast(colors.text, colors.background);
  // 4.5:1 is WCAG AA for body text, which is what this is showing.
  const readable = ratio >= 4.5;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.heading, { color: colors.text }]}>Sample heading</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        This is how your text will look across the app.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Card component</Text>
        <Text style={[styles.cardBody, { color: colors.textMuted }]}>
          Subject content lives here.
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Primary Button</Text>
        </View>
        <View style={[styles.chip, { borderColor: withAlpha(colors.accent, 0.5) }]}>
          <Text style={[styles.chipText, { color: colors.accent }]}>Badge</Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: readable ? colors.textMuted : colors.danger }]}>
        {readable
          ? `Text contrast ${ratio.toFixed(1)}:1 — passes AA`
          : `Text contrast ${ratio.toFixed(1)}:1 — below AA, hard to read`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 2,
  },
  body: {
    fontSize: 13,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    marginTop: space.sm,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 12.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  button: {
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    marginTop: 6,
  },
});
