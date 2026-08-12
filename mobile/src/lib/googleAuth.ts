import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

/**
 * Google sign-in, exchanged for a Supabase session.
 *
 * The Web Client ID below is the one the published app already uses. It must
 * stay in sync with Supabase → Auth → Providers → Google, which validates the
 * ID token's audience against it.
 *
 * Android additionally needs its own OAuth client in Google Cloud whose SHA-1
 * matches the signing certificate — the upload key for internal testing, and
 * the Play App Signing certificate for production. That client is not
 * referenced here; only its existence matters.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '358287134961-24qidem5pd6qhtkq43b3a9cfcp87c49p.apps.googleusercontent.com';

let configured = false;

export function configureGoogleSignIn(): void {
  if (configured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
  configured = true;
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Sign-in cancelled.');
    this.name = 'GoogleSignInCancelled';
  }
}

export interface GoogleAccount {
  email: string | null;
  name: string | null;
}

/**
 * Runs the Google flow and upgrades the current Supabase session to that
 * identity. Progress already stored anonymously is reconciled by the caller.
 */
export async function signInWithGoogle(): Promise<GoogleAccount> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // v16 returns a discriminated result rather than throwing on cancel.
    if (response.type === 'cancelled') {
      throw new GoogleSignInCancelled();
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      throw new Error(error.message);
    }

    return {
      email: response.data?.user?.email ?? null,
      name: response.data?.user?.name ?? null,
    };
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) {
      throw error;
    }
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is unavailable on this device.');
    }
    throw error instanceof Error ? error : new Error('Google sign-in failed.');
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Signing out of Supabase is what actually matters.
  }
  await supabase.auth.signOut();
}

export async function getSignedInEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  // Anonymous sessions have no email; they are not "signed in" for our purpose.
  return user?.email ?? null;
}
