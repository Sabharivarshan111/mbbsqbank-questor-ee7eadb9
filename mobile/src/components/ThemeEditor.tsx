import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { ColorPicker } from '@/components/ColorPicker';
import { Image as ImageIcon, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { contrast } from '@/theme/color';
import { paletteFrom, presetByKey, QUICK_PRESETS, type CustomPalette } from '@/theme/presets';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import { radius, space } from '@/theme/tokens';
import { Image } from 'react-native';
import { DEFAULT_DIM, MIN_DIM, pickWallpaper, solveWallpaper, type Wallpaper } from '@/lib/wallpaper';
import { getWallpaper, setWallpaper } from '@/hooks/useWallpaper';

/**
 * "Create Your Own Theme" — the four colours, laid out as in the published app.
 *
 * A centred modal card rather than a bottom sheet: this is a task with a
 * commit at the end (Reset / Apply Theme), not a quick choice, and a card that
 * owns the screen is the right container for one. It is also what the web app
 * does, which matters more than my preference — somebody switching between the
 * two should not have to relearn where anything is.
 *
 * The picker opens as a popover over the colour it edits, so the swatch you
 * tapped stays visible while you drag. That is the one arrangement in which
 * you can judge a colour: against the thing it will sit next to.
 */

const SLOTS: { key: keyof CustomPalette; name: string; desc: string }[] = [
  { key: 'background', name: 'Background', desc: 'Main page color' },
  { key: 'text', name: 'Text', desc: 'Main text color' },
  { key: 'accent', name: 'Accent', desc: 'Buttons & highlights' },
  { key: 'card', name: 'Card', desc: 'Cards & panels' },
];

export function ThemeEditor({
  visible,
  onClose,
  onApply,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (palette: CustomPalette) => void;
  initial: CustomPalette;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  /**
   * Edited as a draft.
   *
   * Dragging a hue slider passes through every colour on the way to the one
   * you want. Applying each of those to the app would strobe the screen —
   * including this card, which would change colour under your finger. The
   * preview updates continuously; the app changes once, on Apply.
   */
  const [draft, setDraft] = useState<CustomPalette>(initial);
  /**
   * The wallpaper is drafted too, so Reset puts it back and closing without
   * applying leaves the screen as it was. Picking one and then changing your
   * mind should not have already changed the app.
   */
  const [paper, setPaper] = useState<Wallpaper | null>(() => getWallpaper());
  const [editing, setEditing] = useState<keyof CustomPalette | null>(null);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      setEditing(null);
      setDraft(initial);
      setPaper(getWallpaper());
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [visible, initial, reduceMotion, enter]);

  const preview = paletteFrom(draft);
  const ratio = contrast(draft.text, draft.background);
  const readable = ratio >= 4.5;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              opacity: enter,
              transform: reduceMotion
                ? []
                : [
                    // Never from 0 — a card that materialises out of nothing
                    // reads as a glitch rather than as something opening.
                    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                  ],
            },
          ]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.text }]}>🎨 Create Your Own Theme</Text>
            <Touchable onPress={onClose} label="Close" hitSlop={12} scaleTo={0.85}>
              <X size={20} color={colors.textMuted} />
            </Touchable>
          </View>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Pick colors for your perfect look. Changes preview live below.
          </Text>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.grid}>
              {SLOTS.map(slot => (
                <Touchable
                  key={slot.key}
                  // Toggles: tapping the slot whose picker is open closes it,
                  // so the same control both opens and dismisses. Without this
                  // the only way out is a tap on the backdrop, which is also
                  // how the whole editor closes — one miss and the work is
                  // gone.
                  onPress={() => setEditing(current => (current === slot.key ? null : slot.key))}
                  label={`${slot.name}, ${slot.desc}`}
                  hint="Opens the colour picker"
                  state={{ expanded: editing === slot.key }}
                  scaleTo={0.98}
                  style={[
                    styles.slot,
                    {
                      borderColor: editing === slot.key ? colors.text : colors.border,
                      borderWidth: editing === slot.key ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}>
                  <View
                    style={[
                      styles.slotSwatch,
                      { backgroundColor: draft[slot.key], borderColor: colors.border },
                    ]}
                  />
                  <Text style={[styles.slotName, { color: colors.text }]}>{slot.name}</Text>
                  <Text style={[styles.slotDesc, { color: colors.textMuted }]}>{slot.desc}</Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.section, { color: colors.textMuted }]}>Quick presets</Text>
            <View style={styles.grid}>
              {QUICK_PRESETS.map(preset => (
                <Touchable
                  key={preset.name}
                  onPress={() => setDraft(preset.palette)}
                  label={preset.name}
                  hint="Start from this colour set"
                  scaleTo={0.98}
                  style={[styles.quick, { borderColor: colors.border }]}>
                  <View style={styles.stripes}>
                    {[
                      preset.palette.background,
                      preset.palette.text,
                      preset.palette.accent,
                      preset.palette.card,
                    ].map((c, i) => (
                      <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
                    ))}
                  </View>
                  <Text style={[styles.quickName, { color: colors.text }]}>{preset.name}</Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.section, { color: colors.textMuted }]}>Wallpaper</Text>
            {paper ? (
              <View style={[styles.paperRow, { borderColor: colors.border }]}>
                {/* A still frame either way: a video thumbnail here would mean
                    decoding it twice, once for a chip nobody is watching. */}
                {paper.kind === 'image' ? (
                  <Image source={{ uri: paper.uri }} style={styles.paperThumb} />
                ) : (
                  <View style={[styles.paperThumb, styles.paperVideo, { borderColor: colors.border }]}>
                    <Text style={[styles.paperKind, { color: colors.textMuted }]}>VIDEO</Text>
                  </View>
                )}
                <View style={styles.paperBody}>
                  <Text style={[styles.paperName, { color: colors.text }]}>
                    {paper.kind === 'video' ? 'Video wallpaper' : 'Photo wallpaper'}
                  </Text>
                  {/* What the solver decided, stated plainly. A number the app
                      chose on your behalf should be visible, not silent — and
                      it is the difference between "the app dimmed my photo"
                      and "the app dimmed my photo so the text stays legible". */}
                  <Text style={[styles.paperSolved, { color: colors.textMuted }]}>
                    {paper.media
                      ? `Auto: ${Math.round(solveWallpaper(paper, draft.background, draft.text).dim * 100)}% dim keeps text readable`
                      : paper.kind === 'video'
                      ? 'Video cannot be sampled — set the dim by eye'
                      : 'Colour could not be read — set the dim by eye'}
                  </Text>

                  {/* Text colour over the wallpaper. Auto is the solved answer;
                      the two overrides exist because the solver optimises for
                      contrast and a person may simply prefer the other one. */}
                  <View style={styles.dimRow}>
                    {[
                      { key: undefined, label: 'Auto' },
                      { key: '#FFFFFF', label: 'Light' },
                      { key: '#000000', label: 'Dark' },
                    ].map(option => {
                      const active = paper.textColor === option.key;
                      return (
                        <Touchable
                          key={option.label}
                          onPress={() => setPaper({ ...paper, textColor: option.key })}
                          role="radio"
                          label={`${option.label} text`}
                          state={{ checked: active }}
                          scaleTo={0.94}
                          style={[
                            styles.textChip,
                            {
                              backgroundColor: active ? colors.primary : 'transparent',
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.dimText,
                              { color: active ? colors.primaryText : colors.textMuted },
                            ]}>
                            {option.label}
                          </Text>
                        </Touchable>
                      );
                    })}
                  </View>

                  {/* The dim is the readability control, so it lives with the
                      wallpaper rather than in a settings screen. Stepped, not a
                      slider: five choices you can hit with a thumb beat a
                      continuous control that needs a steady hand. */}
                  <View style={styles.dimRow}>
                    {[MIN_DIM, 0.4, DEFAULT_DIM, 0.7, 0.85].map(value => {
                      const active = Math.abs(paper.dim - value) < 0.01;
                      return (
                        <Touchable
                          key={value}
                          onPress={() => setPaper({ ...paper, dim: value })}
                          role="radio"
                          label={`Dim ${Math.round(value * 100)} percent`}
                          state={{ checked: active }}
                          scaleTo={0.9}
                          style={[
                            styles.dimChip,
                            {
                              backgroundColor: active ? colors.primary : 'transparent',
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.dimText,
                              { color: active ? colors.primaryText : colors.textMuted },
                            ]}>
                            {Math.round(value * 100)}
                          </Text>
                        </Touchable>
                      );
                    })}
                  </View>
                </View>
                <Touchable
                  onPress={() => setPaper(null)}
                  label="Remove wallpaper"
                  hitSlop={10}
                  scaleTo={0.85}>
                  <Trash2 size={18} color={colors.danger} />
                </Touchable>
              </View>
            ) : (
              <Touchable
                onPress={async () => {
                  const picked = await pickWallpaper();
                  if (picked) {
                    setPaper(picked);
                  }
                }}
                label="Choose a photo or video"
                hint="Sets a wallpaper behind the home screen"
                scaleTo={0.98}
                style={[styles.paperPick, { borderColor: colors.border }]}>
                <ImageIcon size={18} color={colors.accent} />
                <Text style={[styles.paperPickText, { color: colors.text }]}>
                  Choose a photo or video…
                </Text>
              </Touchable>
            )}

            {/* The preview is the app, drawn in the draft — including the
                derived surfaces, so what is shown is what will actually
                render, not the four colours that were picked. */}
            <View
              style={[
                styles.preview,
                { backgroundColor: preview.background, borderColor: preview.border },
              ]}>
              <Text style={[styles.previewLabel, { color: preview.textMuted }]}>Live preview</Text>
              <Text style={[styles.previewHeading, { color: preview.text }]}>Sample Heading</Text>
              <Text style={[styles.previewBody, { color: preview.text }]}>
                This is how your text will look across the app.
              </Text>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: preview.card, borderColor: preview.border },
                ]}>
                <Text style={[styles.previewCardTitle, { color: preview.text }]}>
                  Card component
                </Text>
                <Text style={[styles.previewCardBody, { color: preview.textMuted }]}>
                  Subject content lives here.
                </Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: preview.accent }]}>
                <Text style={[styles.previewButtonText, { color: preview.onAccent }]}>
                  Primary Button
                </Text>
              </View>
              {/* Four free colours can produce unreadable text. Rather than
                  refusing the choice, say so plainly at the moment it happens. */}
              <Text
                style={[
                  styles.previewMeta,
                  { color: readable ? preview.textMuted : preview.danger },
                ]}>
                {readable
                  ? `Text contrast ${ratio.toFixed(1)}:1 — passes AA`
                  : `Text contrast ${ratio.toFixed(1)}:1 — below AA, hard to read`}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Touchable
              onPress={() => {
                setDraft(presetByKey('dark')!.palette!);
                setPaper(null);
              }}
              label="Reset"
              hint="Back to the default colours"
              scaleTo={0.97}
              style={[styles.action, { borderColor: colors.border }]}>
              <Text style={[styles.actionText, { color: colors.text }]}>Reset</Text>
            </Touchable>
            <Touchable
              onPress={() => {
                setWallpaper(paper);
                onApply(draft);
              }}
              label="Apply Theme"
              scaleTo={0.97}
              style={[
                styles.action,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}>
              <Text style={[styles.actionText, { color: colors.primaryText }]}>Apply Theme</Text>
            </Touchable>
          </View>

          {/*
            * The picker has no scrim of its own.
            *
            * A full-card scrim would cover the four slots, so switching from
            * Background to Accent would mean dismiss, tap, drag, dismiss —
            * when what you actually do is compare them against each other.
            * Without it, the slots stay live and tapping another one just
            * moves the picker. It closes on Done, or when the editor does.
            */}
          {editing ? (
            <View style={styles.popoverLayer} pointerEvents="box-none">
              <View
                style={[
                  styles.popover,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}>
                <View style={styles.popoverHead}>
                  <Text style={[styles.popoverTitle, { color: colors.text }]}>
                    {SLOTS.find(s => s.key === editing)!.name}
                  </Text>
                  <Touchable
                    onPress={() => setEditing(null)}
                    label="Close colour picker"
                    hitSlop={12}
                    scaleTo={0.85}>
                    <X size={18} color={colors.textMuted} />
                  </Touchable>
                </View>
                <ColorPicker
                  value={draft[editing]}
                  onChange={hex => setDraft(current => ({ ...current, [editing]: hex }))}
                  label={SLOTS.find(s => s.key === editing)!.name}
                />
              </View>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
  },
  card: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: space.lg,
    elevation: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: space.lg,
    marginTop: 6,
  },
  body: {
    marginTop: space.md,
  },
  bodyContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  slot: {
    width: '48.5%',
    borderRadius: radius.md,
    padding: space.md,
  },
  slotSwatch: {
    height: 42,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.sm,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '700',
  },
  slotDesc: {
    fontSize: 12.5,
    marginTop: 2,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
  },
  quick: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 46,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm,
  },
  stripes: {
    flexDirection: 'row',
    width: 52,
    height: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
  },
  quickName: {
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewHeading: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: space.sm,
  },
  previewBody: {
    fontSize: 14,
    marginTop: space.sm,
  },
  previewCard: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    marginTop: space.md,
  },
  previewCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewCardBody: {
    fontSize: 13,
    marginTop: 2,
  },
  previewButton: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: space.lg,
    paddingVertical: 11,
    marginTop: space.md,
  },
  previewButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewMeta: {
    fontSize: 11.5,
    marginTop: space.md,
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: space.md,
  },
  action: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  paperPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    paddingHorizontal: space.md,
  },
  paperPickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.sm,
  },
  paperThumb: {
    width: 46,
    height: 46,
    borderRadius: 6,
  },
  paperVideo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  paperKind: {
    fontSize: 9,
    fontWeight: '700',
  },
  paperBody: {
    flex: 1,
    gap: 6,
  },
  paperName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  dimRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dimChip: {
    minWidth: 34,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSolved: {
    fontSize: 11,
  },
  textChip: {
    minWidth: 46,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimText: {
    fontSize: 11,
    fontWeight: '700',
  },
  popoverLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  popover: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    elevation: 20,
  },
});
