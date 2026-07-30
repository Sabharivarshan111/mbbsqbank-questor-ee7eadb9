import { useState } from "react";
import { ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { usePremium } from "@/hooks/use-premium";

/**
 * "Remove ads for ₹50 / month" upsell. Shown under the daily rewarded-ad
 * consent card. Requires a Google-signed-in account so the entitlement can be
 * attributed to a real user across devices.
 */
export default function RemoveAdsButton({ onDone }: { onDone?: () => void }) {
  const { isPremium, signedIn, expiresAt, startCheckout } = usePremium();
  const [busy, setBusy] = useState(false);

  if (isPremium) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
        Ad-free until {expiresAt ? new Date(expiresAt).toLocaleDateString() : "soon"} 💜
      </p>
    );
  }

  const handle = async () => {
    setBusy(true);
    try {
      if (!signedIn) {
        toast.info("Sign in with Google to buy the ad-free month.");
        if (isNative()) await nativeGoogleSignIn();
        else await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        return;
      }
      const err = await startCheckout();
      if (err) toast.error(err);
      else {
        toast.success("You're ad-free for 30 days. Thank you!");
        onDone?.();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="w-full h-11 rounded-xl border border-primary/40 bg-background/60 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
      Remove ads — ₹50 for 1 month
    </button>
  );
}
