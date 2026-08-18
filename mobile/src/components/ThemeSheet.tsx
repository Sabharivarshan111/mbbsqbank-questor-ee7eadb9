import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { Sheet } from '@/components/Sheet';
import { ThemePreview } from '@/components/ThemePreview';
import { ColorPicker } from '@/components/ColorPicker';
import { Check, Palette, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/theme';
import {
  PRESETS,
  QUICK_PRESETS,
  presetByKey,
  type CustomPalette,
} from '@/theme/presets';
import { radius, space } from '@/theme/tokens';

/**
 * Themes: the named ones, plus one you build yourself.
 *
 * Four free colours can produce unreadable text — that is a real property of
 * the design, not a reason to withhold it. Rather than narrowing the choice,
 * the editor makes the consequence visible: the preview is the whole app in
 * miniature, and the contrast figure under it turns red and says so when the
 * combination drops below AA. The user is informed rather than restricted.
 *
 * Semantic colours are the one thing a theme cannot reach. Success, warning
 * and danger stay green, amber and red in every theme, because a tick that
 * means "done" and a bar that means "wrong" have to keep meaning that. Only
 * the accent, surfaces and text move.
 */

/** Four swatches, the way the preset lists show a theme at a glance. */
function Swatches({ palette }: { palette: CustomPalette }) {
  return (
    <View style={styles.swatches}>
      {[palette.background, palette.text, palette.accent, palette.card].map((color, i) => (
        <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, preference, setPreference, custom, setCustom } = useTheme();
  const [editing, setEditing] = useState(false);

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Create your own' : 'Themes'}>
      {editing ? (
        <CustomEditor
          initial={custom ?? presetByKey('dark')!.palette!}
          onCancel={() => setEditing(false)}
          onApply={next => {
            setCustom(next);
            setPreference('custom');
            setEditing(false);
          }}
        />
      ) : (
        <View style={styles.list}>
          {PRESETS.map(preset => (
            <Row
              key={preset.key}
              name={preset.name}
              active={preference === preset.key}
              onPress={() => setPreference(preset.key)}
              left={<Swatches palette={preset.palette!} />}
            />
          ))}

          <Row
            name="System"
            hint="Follows your phone"
            active={preference === 'system'}
            onPress={() => setPreference('system')}
            left={
              <View style={styles.icon}>
                <Smartphone size={17} color={colors.text} />
              </View>
            }
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {custom ? (
            <Row
              name="My Theme"
              active={preference === 'custom'}
              onPress={() => setPreference('custom')}
              left={<Swatches palette={custom} />}
            />
          ) : null}

          <Row
            name={custom ? 'Edit my theme…' : 'Create your own…'}
            onPress={() => setEditing(true)}
            left={
              <View style={styles.icon}>
                <Palette size={17} color={colors.accent} />
              </View>
            }
          />

          <View style={styles.previewWrap}>
            <ThemePreview label="Current theme" />
          </View>
        </View>
      )}
    </Sheet>
  );
}

function Row({
  name,
  hint,
  active,
  onPress,
  left,
}: {
  name: string;
  hint?: string;
  active?: boolean;
  onPress: () => void;
  left: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Touchable
      onPress={onPress}
      role="radio"
      label={name}
      hint={hint}
      state={{ selected: !!active }}
      scale={false}
      dim
      style={styles.row}>
      {left}
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: colors.text, fontWeight: active ? '700' : '600' }]}>
          {name}
        </Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {active ? <Check size={17} color={colors.accent} strokeWidth={3} /> : null}
    </Touchable>
  );
}

/** Which of the four colours the picker is currently editing. */
const SLOTS: { key: keyof CustomPalette; name: string; desc: string }[] = [
  { key: 'background', name: 'Background', desc: 'Main page colour' },
  { key: 'text', name: 'Text', desc: 'Main text colour' },
  { key: 'accent', name: 'Accent', desc: 'Buttons & highlights' },
  { key: 'card', name: 'Card', desc: 'Cards & panels' },
];

function CustomEditor({
  initial,
  onApply,
  onCancel,
}: {
  initial: CustomPalette;
  onApply: (palette: CustomPalette) => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  /**
   * Edited as a draft rather than applied live.
   *
   * Dragging a hue slider passes through every colour on the way to the one
   * you want. Applying each of those to the whole app would strobe the screen
   * — including the sheet you are dragging in, which would change colour under
   * your finger. The preview updates continuously; the app changes once.
   */
  const [draft, setDraft] = useState<CustomPalette>(initial);
  const [slot, setSlot] = useState<keyof CustomPalette>('accent');

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const setSlotColor = useCallback(
    (hex: string) => setDraft(current => ({ ...current, [slot]: hex })),
    [slot],
  );

  return (
    <ScrollView
      style={styles.editor}
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Pick a colour for each part. The preview below is the whole app.
      </Text>

      <View style={styles.slotGrid}>
        {SLOTS.map(item => {
          const active = slot === item.key;
          return (
            <Touchable
              key={item.key}
              onPress={() => setSlot(item.key)}
              role="radio"
              label={item.name}
              hint={item.desc}
              state={{ selected: active }}
              scaleTo={0.97}
              style={[
                styles.slot,
                {
                  borderColor: active ? colors.text : colors.border,
                  borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                },
              ]}>
              <View
                style={[
                  styles.slotSwatch,
                  { backgroundColor: draft[item.key], borderColor: colors.border },
                ]}
              />
              <Text style={[styles.slotName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.slotDesc, { color: colors.textMuted }]}>{item.desc}</Text>
            </Touchable>
          );
        })}
      </View>

      <ColorPicker
        value={draft[slot]}
        onChange={setSlotColor}
        label={SLOTS.find(s => s.key === slot)!.name}
      />

      <Text style={[styles.section, { color: colors.textMuted }]}>Quick presets</Text>
      <View style={styles.quickGrid}>
        {QUICK_PRESETS.map(preset => (
          <Touchable
            key={preset.name}
            onPress={() => setDraft(preset.palette)}
            label={preset.name}
            hint="Start from this colour set"
            scaleTo={0.97}
            style={[styles.quick, { borderColor: colors.border }]}>
            <Swatches palette={preset.palette} />
            <Text style={[styles.quickName, { color: colors.text }]}>{preset.name}</Text>
          </Touchable>
        ))}
      </View>

      <View style={styles.previewWrap}>
        <ThemePreview palette={draft} />
      </View>

      <View style={styles.actions}>
        <Touchable
          onPress={onCancel}
          label="Cancel"
          scaleTo={0.97}
          style={[styles.action, { borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.text }]}>Cancel</Text>
        </Touchable>
        <Touchable
          onPress={() => onApply(draft)}
          label="Apply theme"
          scaleTo={0.97}
          style={[
            styles.action,
            { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}>
          <Text style={[styles.actionText, { color: colors.primaryText }]}>Apply theme</Text>
        </Touchable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
  },
  rowHint: {
    fontSize: 12,
  },
  icon: {
    width: 44,
    alignItems: 'center',
  },
  swatches: {
    flexDirection: 'row',
    width: 44,
    height: 22,
    borderRadius: 5,
    overflow: 'hidden',
  },
  swatch: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.sm,
  },
  previewWrap: {
    marginTop: space.md,
  },
  editor: {
    // The editor is taller than the sheet on a small phone, so it scrolls
    // inside it rather than pushing the actions off the bottom.
    maxHeight: 560,
  },
  editorContent: {
    gap: space.md,
    paddingBottom: space.sm,
  },
  sub: {
    fontSize: 13.5,
  },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  slot: {
    width: '48.5%',
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
  },
  slotSwatch: {
    height: 34,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  slotName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  slotDesc: {
    fontSize: 11.5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  quick: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm,
  },
  quickName: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  action: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
