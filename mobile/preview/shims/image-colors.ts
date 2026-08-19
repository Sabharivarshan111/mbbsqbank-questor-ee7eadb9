/**
 * Dev-only stand-in for react-native-image-colors.
 *
 * Android's Palette API has no browser equivalent, and decoding the image here
 * to average it would be measuring a different thing from what ships. It
 * returns the mid grey the real call falls back to, so the readability solver
 * runs on a plausible input rather than crashing.
 *
 * Default export, matching v1.x — the version this project is pinned to,
 * because 2.x is an Expo module and bare React Native cannot resolve it.
 */
const ImageColors = {
  async getColors() {
    return { platform: 'android' as const, average: '#808080', dominant: '#808080' };
  },
};
export default ImageColors;
