import React, { useMemo } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { FONT_FAMILY, MAX_FONT_SCALE, leading, tracking } from '@/theme/typography';
import { useTextScale } from '@/theme/textScale';

/**
 * Drop-in replacement for React Native's Text that applies the app font.
 * Screens import this instead of the built-in so typography stays consistent
 * across OEM skins — see src/theme/typography.ts.
 *
 * It also owns two things no screen should have to remember:
 *
 *   • The cap on the OS font-size setting. Text still grows with the user's
 *     preference, but Android allows up to 2x, which overflows fixed-height
 *     rows and the bottom bar.
 *   • The in-app text size (src/theme/textScale.tsx). When it is at Default —
 *     which it is for everyone until they change it — this component does
 *     nothing extra at all, so the common path stays free. Only a non-default
 *     scale pays for flattening the style.
 */
export function Text({ style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const scale = useTextScale();

  const scaled = useMemo(() => {
    // Fast path: no work for the default, which is what almost every render
    // in a 500-row list will hit.
    if (scale === 1) {
      return style;
    }
    const flat = StyleSheet.flatten(style) as TextStyle | undefined;
    const base = flat?.fontSize;
    if (!base) {
      return style;
    }
    const fontSize = Math.round(base * scale);
    // Recompute leading and tracking from the *new* size rather than scaling
    // the old ones. Both are size-specific functions, so a scaled 13pt value
    // is not the right value for 15pt — that is the whole point of the ramp.
    return [
      style,
      { fontSize, lineHeight: leading(fontSize), letterSpacing: tracking(fontSize) },
    ];
  }, [scale, style]);

  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      style={[styles.base, scaled]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILY,
  },
});
