/**
 * Google Sign-In is a native module with no web implementation. The preview
 * harness never exercises the real flow, so this stub keeps the bundle
 * resolvable and makes the button report that it is unavailable.
 */
export const GoogleSignin = {
  configure() {},
  async hasPlayServices() {
    return true;
  },
  async signIn(): Promise<never> {
    throw new Error('Google Sign-In is only available in the native app.');
  },
  async signOut() {},
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  IN_PROGRESS: 'IN_PROGRESS',
};

export function isErrorWithCode(_error: unknown): boolean {
  return false;
}
