import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { usePremium } from "@/hooks/use-premium";
import { useDoubleTap } from "@/hooks/use-double-tap";

/**
 * Publicly this is a disabled "Ad-free plan — coming soon" card.
 * Internally, a quick double tap runs the real Razorpay checkout so the
 * payment flow can be verified end-to-end. Nothing in the UI hints at this.
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

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!signedIn) {
        toast.info("Sign in with Google first.");
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

  const handleTap = useDoubleTap(() => { void run(); }, 400);

  return (
    <div
      onClick={handleTap}
      role="note"
      className="w-full h-11 rounded-xl border border-border/60 bg-muted/40 text-sm font-semibold flex items-center justify-center gap-2 text-muted-foreground select-none cursor-default"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Ad-free plan — coming soon
    </div>
  );
}
