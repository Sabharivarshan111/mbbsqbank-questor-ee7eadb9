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
 * Open Google OAuth in the system browser (Chrome Custom Tabs on Android)
 * to avoid Google's "disallowed_useragent" 403 inside the in-app WebView.
 */
export async function nativeGoogleSignIn(): Promise<void> {
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
