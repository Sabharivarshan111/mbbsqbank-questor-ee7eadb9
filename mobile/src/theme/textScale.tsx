import { createContext, useContext } from 'react';

/**
 * In-app text size.
 *
 * The header has always had a "FONT SIZE" control. It was a plain View — it
 * looked pressable and did nothing, which is worse than not having it: a
 * control that lies about being a control costs trust every time someone taps
 * it (apple-design §16 Craft, and §2 Agency — offer real choices).
 *
 * Android's own font-size setting already scales the app, but it is buried in
 * system settings and it changes every app at once. Someone reading pathology
 * questions for three hours wants this app bigger, not their whole phone. So
 * the control is now real.
 *
 * The values multiply the type ramp. They stay modest deliberately: the
 * layouts are tuned for the default, and 1.15 is about as far as the fixed-
 * height rows stretch before they start clipping.
 */
export type TextSize = 'default' | 'large' | 'larger';

export const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  default: 1,
  large: 1.08,
  larger: 1.15,
};

export const TEXT_SIZE_OPTIONS: { key: TextSize; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'large', label: 'Large' },
  { key: 'larger', label: 'Larger' },
];

/**
 * Read by every Text in the app, so it is its own context rather than part of
 * the theme — a theme change should not have to walk every text node, and a
 * text-size change should not invalidate colours.
 */
export const TextScaleContext = createContext<number>(1);

export function useTextScale(): number {
  return useContext(TextScaleContext);
}
