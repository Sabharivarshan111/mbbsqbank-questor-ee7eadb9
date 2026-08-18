import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Touchable } from '@/components/Touchable';
import { useTheme } from '@/theme';
import { radius, space, TOUCH_MIN } from '@/theme/tokens';

/**
 * Filters a list that is already on screen.
 *
 * Deliberately not the same thing as the Search tab. That one builds an index
 * over the whole question bank and debounces at 220ms because the work is
 * real; this filters an array that is already in memory, so it runs on every
 * keystroke — a debounce here would add lag to hide work that does not exist.
 *
 * The caller decides whether to show it at all. A field above a list of three
 * is chrome that costs a row of vertical space and earns nothing; above sixty
 * it is the difference between finding a question and scrolling for it.
 */
export function FilterField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Spoken by TalkBack in place of the placeholder. */
  label: string;
}) {
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Search size={16} color={colors.textMuted} />
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        // A filter is a refinement, not a submission: there is nothing to
        // "search for", so the keyboard should not offer to.
        returnKeyType="done"
        autoCorrect={false}
        autoCapitalize="none"
        // Android underlines the field by default, which fights the pill.
        underlineColorAndroid="transparent"
        style={[styles.input, { color: colors.text }]}
      />
      {value.length > 0 ? (
        <Touchable
          onPress={() => {
            onChange('');
            // Keep the caret where it was: clearing is a correction, and
            // dismissing the keyboard would make the next attempt cost an
            // extra tap.
            input.current?.focus();
          }}
          label="Clear filter"
          hitSlop={12}
          scaleTo={0.85}>
          <X size={16} color={colors.textMuted} />
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    minHeight: TOUCH_MIN,
  },
  input: {
    flex: 1,
    fontSize: 15,
    // Height comes from the wrapper's minHeight; padding here would push the
    // field past the 44dp target instead of filling it.
    paddingVertical: 0,
  },
});
