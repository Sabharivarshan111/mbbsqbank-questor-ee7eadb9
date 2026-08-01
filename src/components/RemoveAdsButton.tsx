import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useRazorpayTestCheckout } from "@/hooks/use-razorpay-test-checkout";
import { useDoubleTap } from "@/hooks/use-double-tap";

/**
 * Publicly this is a disabled "Ad-free plan — coming soon" card.
 * Internally, a quick double tap runs the real Razorpay checkout so the
 * payment integration can be verified end-to-end. Nothing in the UI hints at it.
 */
export default function RemoveAdsButton({ onDone }: { onDone?: () => void }) {
  const { signedIn, startCheckout } = useRazorpayTestCheckout();
  const [busy, setBusy] = useState(false);

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
        toast.success("Test payment verified successfully.");
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
