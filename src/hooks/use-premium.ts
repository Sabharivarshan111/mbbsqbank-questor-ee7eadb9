import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export interface PremiumState {
  loading: boolean;
  isPremium: boolean;
  expiresAt: string | null;
  signedIn: boolean;
}

/**
 * Ad-free premium: ₹50 / 30 days, tied to the Google-signed-in Supabase user.
 * Entitlement lives in `premium_subscriptions` and is written only by the
 * payment-verification edge function (service role), never by the client.
 */
export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    loading: true, isPremium: false, expiresAt: null, signedIn: false,
  });

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, isPremium: false, expiresAt: null, signedIn: false });
      return;
    }
    const { data } = await supabase
      .from("premium_subscriptions")
      .select("expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setState({
      loading: false,
      signedIn: true,
      isPremium: !!data?.expires_at,
      expiresAt: data?.expires_at ?? null,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  /** Opens the Razorpay modal. Resolves with an error message, or null on success. */
  const startCheckout = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return "Please sign in with Google first.";

    const ok = await loadRazorpay();
    if (!ok) return "Could not load the payment window. Check your connection.";

    const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
      body: { plan: "adfree_monthly" },
    });
    if (error || (data as any)?.error) {
      // functions.invoke hides the body on non-2xx — read it from the response.
      let serverMsg: string | null = null;
      try {
        const res = (error as any)?.context;
        if (res && typeof res.json === "function") {
          const body = await res.json();
          serverMsg = typeof body?.error === "string" ? body.error : JSON.stringify(body?.error ?? null);
        }
      } catch { /* ignore */ }
      return (data as any)?.error ?? serverMsg ?? error?.message ?? "Could not start the payment.";
    }

    const order = data as { order_id: string; amount: number; currency: string; key_id: string };

    return await new Promise<string | null>((resolve) => {
      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "ORBIT MBBS QBANK",
        description: "Ad-free for 30 days",
        order_id: order.order_id,
        prefill: { email: session.user.email ?? "" },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => resolve("Payment cancelled.") },
        handler: async (resp: any) => {
          const { data: v, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          if (vErr || (v as any)?.error || !(v as any)?.success) {
            resolve((v as any)?.error ?? vErr?.message ?? "Payment could not be verified.");
            return;
          }
          await refresh();
          resolve(null);
        },
      });
      rzp.on("payment.failed", (e: any) => {
        resolve(e?.error?.description ?? "Payment failed. You were not charged.");
      });
      rzp.open();
    });
  }, [refresh]);

  return { ...state, refresh, startCheckout };
}
