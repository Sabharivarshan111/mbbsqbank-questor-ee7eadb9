import React from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { FONT_FAMILY, MAX_FONT_SCALE } from '@/theme/typography';

/**
 * Drop-in replacement for React Native's Text that applies the app font.
 * Screens import this instead of the built-in so typography stays consistent
 * across OEM skins — see src/theme/typography.ts.
 *
 * It also caps how far the OS font-size setting can scale text. Text still
 * grows with the user's preference, but Android allows up to 2x, which
 * overflows the fixed-height rows and the bottom bar. Capping here means no
 * screen has to remember to do it.
 */
export function Text({ style, maxFontSizeMultiplier, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      style={[styles.base, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILY,
  },
});
