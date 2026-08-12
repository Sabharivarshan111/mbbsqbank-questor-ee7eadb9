/**
 * react-native-svg's web build reaches for React Native's asset registry, which
 * only exists in the Metro bundle. The preview never renders image-backed SVGs,
 * so a stub is enough. Native builds use the real module.
 */
export function registerAsset(): number {
  return 0;
}

export function getAssetByID(): undefined {
  return undefined;
}

export default { registerAsset, getAssetByID };
