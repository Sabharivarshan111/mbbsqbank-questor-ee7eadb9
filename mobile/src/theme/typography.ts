import { Platform } from 'react-native';

/**
 * The app is typeset in Roboto.
 *
 * The web build never declared a font, so it inherited Tailwind's stack, which
 * names Roboto and resolves to it inside the Android WebView. React Native
 * instead defaults to whatever the *system* font is — and OEM skins replace
 * that (MIUI ships MiSans, One UI ships SamsungOne), which would silently
 * change the app's typography on those phones. Naming Roboto explicitly keeps
 * every device on the same face as the original app; Roboto is present in
 * /system/fonts on all Android builds, including the skinned ones.
 */
export const FONT_FAMILY = Platform.select({
  android: 'Roboto',
  default: undefined,
});
