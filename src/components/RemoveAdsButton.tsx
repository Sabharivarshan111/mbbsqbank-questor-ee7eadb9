import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useRazorpayTestCheckout } from "@/hooks/use-razorpay-test-checkout";
import { usePremium } from "@/hooks/use-premium";

/**
 * Real ad-free purchase: ₹50 for one month, single tap.
 * Requires a Google sign-in so the subscription can be attached to an account.
 */
export default function RemoveAdsButton({ onDone }: { onDone?: () => void }) {
  const { signedIn, startCheckout } = useRazorpayTestCheckout();
  const { premium, expiresAt, refresh } = usePremium();
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
        toast.success("Payment successful — ads are removed for 30 days.");
        await refresh();
        onDone?.();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (premium) {
    return (
      <div className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-500 flex items-center justify-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Ad-free active{expiresAt ? ` until ${new Date(expiresAt).toLocaleDateString()}` : ""}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <button
        onClick={() => void run()}
        disabled={busy}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition disabled:opacity-70"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Remove ads — ₹50 / month
      </button>
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 space-y-1">
        <p className="flex items-start gap-1.5 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Before you pay, please read:
        </p>
        <p>• You <strong>must be signed in with Google</strong> — otherwise the ad-free plan cannot be linked to your account.</p>
        <p>• After paying, <strong>take a screenshot</strong> of the payment / UPI reference ID and send it to <strong>9080220563</strong> on WhatsApp, so any future issue can be sorted out instantly.</p>
      </div>
    </div>
  );
}
