/**
 * Dev-only stand-in for react-native-image-picker.
 *
 * The preview runs in a browser through react-native-web, where the native
 * picker does not exist. It returns "cancelled" rather than a fake asset: a
 * stub that invented a wallpaper would make the harness show a state the app
 * cannot actually reach from a tap, which is worse than showing nothing.
 */
export async function launchImageLibrary() {
  return { didCancel: true, assets: [] };
}
export async function launchCamera() {
  return { didCancel: true, assets: [] };
}
