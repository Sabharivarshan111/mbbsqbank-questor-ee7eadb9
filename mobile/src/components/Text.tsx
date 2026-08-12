import React from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { FONT_FAMILY } from '@/theme/typography';

/**
 * Drop-in replacement for React Native's Text that applies the app font.
 * Screens import this instead of the built-in so typography stays consistent
 * across OEM skins — see src/theme/typography.ts.
 */
export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILY,
  },
});
