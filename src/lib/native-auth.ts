import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

export const NATIVE_REDIRECT = "app.lovable.orbitmbbs://auth/callback";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Native Google Sign-In for Capacitor (Android/iOS).
 *
 * Prefers the native Google account picker via @codetrix-studio/capacitor-google-auth
 * (returns an idToken we hand to Supabase via signInWithIdToken — no web redirects).
 * Falls back to the system-browser OAuth flow if the native plugin is unavailable
 * or not configured (e.g. missing Google OAuth Web Client ID in capacitor.config).
 */
export async function nativeGoogleSignIn(): Promise<void> {
  // 1) Try native Google account picker → idToken → Supabase signInWithIdToken
  //    Skip entirely if the capacitor.config still has the placeholder client ID,
  //    so we don't burn a confusing "invalid client" error on the user.
  let nativeAttempted = false;
  try {
    const mod: any = await import("@codetrix-studio/capacitor-google-auth");
    const GoogleAuth = mod.GoogleAuth;
    if (GoogleAuth) {
      nativeAttempted = true;
      try {
        await GoogleAuth.initialize?.();
      } catch {}
      const result = await GoogleAuth.signIn();
      const idToken: string | undefined =
        result?.authentication?.idToken ?? result?.idToken;
      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        return;
      }
    }
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? "");
    console.warn("Native Google Sign-In unavailable, falling back to browser flow:", e);
    // Surface the "needs Play Store update" hint if the native plugin clearly
    // isn't wired up in this APK build.
    if (
      nativeAttempted &&
      (msg.includes("YOUR_GOOGLE_WEB_CLIENT_ID") ||
        msg.toLowerCase().includes("client") ||
        msg.toLowerCase().includes("12500") ||
        msg.toLowerCase().includes("developer"))
    ) {
      throw new Error(
        "Google Sign-In isn't available on this build. Please update Orbit MBBS from the Play Store, or sign in with Email."
      );
    }
  }

  // 2) Fallback: open Google OAuth in Chrome Custom Tabs (system browser)
  //    and complete via deep-link listener below.
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_REDIRECT,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("No OAuth URL returned");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  } catch (e) {
    throw new Error(
      "Google Sign-In isn't available on this build. Please update Orbit MBBS from the Play Store, or sign in with Email."
    );
  }
}


/**
 * Register a one-time deep-link listener that completes the OAuth flow
 * when the system browser redirects back to our custom scheme.
 */
let registered = false;
export function registerNativeAuthListener() {
  if (registered || !isNative()) return;
  registered = true;

  CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith(NATIVE_REDIRECT.split("://")[0] + "://")) return;
    try {
      const u = new URL(url);
      // PKCE flow: ?code=...
      const code = u.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else {
        // Implicit flow: tokens in hash fragment
        const hash = u.hash?.startsWith("#") ? u.hash.slice(1) : u.hash;
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    } catch (e) {
      console.error("Deep-link auth exchange failed:", e);
    } finally {
      try {
        await Browser.close();
      } catch {}
    }
  });
}
