import React from 'react';
import { StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Touchable } from '@/components/Touchable';
import { useTheme } from '@/theme';

/**
 * The one way back, in the one place it always lives.
 *
 * Consistency is what makes a control predictable — if a thing looks the same
 * it must behave the same and sit in the same place (SKILL §16 Familiarity) —
 * and every screen having its own hand-rolled back arrow is how that drifts.
 * It also guarantees the 44dp touch target that a bare 20dp icon does not
 * meet on its own.
 */
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <Touchable onPress={onPress} label={label} scaleTo={0.88} hitSlop={12} style={styles.button}>
      <ArrowLeft size={20} color={colors.text} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    width: 40,
    marginLeft: -8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
