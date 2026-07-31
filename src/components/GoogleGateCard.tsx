import { useState } from "react";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useProfile } from "@/hooks/use-profile";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * Shown above the essay / short-note list for users who have NOT signed in with
 * Google. Reuses the exact sign-in flow from My Progress (native account picker
 * on Android, linkIdentity → signInWithOAuth fallback on web) so anonymous
 * progress carries over. Never triggers an ad.
 */
export default function GoogleGateCard() {
  const { local, isAnonymous, saveProfile } = useProfile();
  const [name, setName] = useState(local?.display_name ?? "");
  const [busy, setBusy] = useState(false);

  if (!isAnonymous) return null;

  const needsName = !local?.display_name?.trim();

  const handleSignIn = async () => {
    setBusy(true);
    try {
      if (needsName) {
        const clean = name.trim();
        if (clean.length < 2) {
          toast.error("Please enter your name first.");
          setBusy(false);
          return;
        }
        await saveProfile({ display_name: clean, year: local?.year ?? "second" });
      }

      if (isNative()) {
        await nativeGoogleSignIn();
        return;
      }

      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin },
      } as any);
      if (error) {
        const { error: e2 } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (e2) throw e2;
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/10 p-4 space-y-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm">We've crossed 1000+ users 🎉</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            To prevent spam, you're requested to sign in with Google. Signing in takes only
            one time — all your existing progress, XP, streak and notes are carried over
            automatically. Don't worry, you won't get any ad for signing in with Google.
          </p>
        </div>
      </div>

      {needsName && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary/60"
        />
      )}

      <button
        onClick={handleSignIn}
        disabled={busy}
        className="group relative w-full rounded-2xl p-[1.5px] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 disabled:opacity-60"
      >
        <span className="flex items-center justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-sm font-semibold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          {busy ? "Connecting…" : "Sign in with Google"}
        </span>
      </button>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          You must be using the <strong>ORBIT MBBS</strong> app downloaded from the Play Store,
          on the latest version. Search "Orbit MBBS" on the Play Store and install it. If you are
          using an illegitimate version, or an older version from the Play Store, kindly update it
          to the newest version.
        </p>
      </div>
    </div>
  );
}
