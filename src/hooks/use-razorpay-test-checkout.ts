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

/** functions.invoke hides the body on non-2xx — pull the real server message out. */
async function readInvokeError(error: any, data: any): Promise<string | null> {
  if (data && typeof data.error === "string") return data.error;
  const ctx = error?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const raw = await ctx.text();
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.error === "string") return parsed.error;
        return raw || null;
      } catch {
        return raw || null;
      }
    } catch { /* ignore */ }
  }
  return error?.message ?? null;
}

/**
 * Razorpay Standard Checkout, test-only: creates a ₹1 order server-side, opens
 * the modal, then verifies the signature server-side. Nothing is unlocked.
 */
export function useRazorpayTestCheckout() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (alive) setSignedIn(!!user);
    };
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void sync(); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  /** Resolves with an error message, or null when the payment verified. */
  const startCheckout = useCallback(async (plan: "adfree_monthly" | "notes_fmspm" = "adfree_monthly"): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return "Please sign in first.";

    const scriptOk = await loadRazorpay();
    if (!scriptOk) return "Could not load the payment window. Check your connection.";

    const { data, error } = await supabase.functions.invoke("razorpay-create-order", { body: { plan } });
    if (error || (data as any)?.error) {
      return (await readInvokeError(error, data)) ?? "Could not start the payment.";
    }

    const order = data as { order_id: string; amount: number; currency: string; key_id: string };
    if (!order?.order_id || !order?.key_id) return "Order could not be created.";

    return await new Promise<string | null>((resolve) => {
      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "ORBIT MBBS QBANK",
        description: (data as any)?.label ?? "ORBIT purchase",
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
              plan,
            },
          });
          if (vErr || (v as any)?.error || !(v as any)?.success) {
            resolve((await readInvokeError(vErr, v)) ?? "Payment could not be verified.");
            return;
          }
          resolve(null);
        },
      });
      rzp.on("payment.failed", (e: any) => {
        resolve(e?.error?.description ?? "Payment failed. You were not charged.");
      });
      rzp.open();
    });
  }, []);

  return { signedIn, startCheckout };
}
