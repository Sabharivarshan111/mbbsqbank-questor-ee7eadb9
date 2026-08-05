import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const isStr = (v: unknown, min: number, max: number) =>
  typeof v === "string" && v.length >= min && v.length <= max;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) return json({ error: "Razorpay keys are not configured." }, 500);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const orderId = body?.razorpay_order_id;
    const paymentId = body?.razorpay_payment_id;
    const signature = body?.razorpay_signature;
    const planKey = typeof body?.plan === "string" && body.plan === "notes_fmspm"
      ? "notes_fmspm"
      : "adfree_monthly";
    if (!isStr(orderId, 5, 120) || !isStr(paymentId, 5, 120) || !isStr(signature, 10, 200)) {
      return json({ error: "Missing or invalid payment fields." }, 400);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Not signed in." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Session expired. Sign in again." }, 401);

    const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
    if (!constantTimeEqual(expected, signature as string)) {
      console.warn("signature mismatch for order", orderId);
      return json({ error: "Payment signature could not be verified." }, 400);
    }

    // Signature is valid → record / extend the purchase.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const user = userData.user;

    let expiresAt: string;
    if (planKey === "notes_fmspm") {
      // One-time purchase → lifetime access.
      expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const { data: existing } = await admin
        .from("premium_subscriptions")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("plan", "adfree_monthly")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const base = existing?.expires_at && new Date(existing.expires_at) > new Date()
        ? new Date(existing.expires_at)
        : new Date();
      expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error: insErr } = await admin.from("premium_subscriptions").insert({
      user_id: user.id,
      email: user.email ?? null,
      plan: planKey,
      amount_paise: 5000,
      razorpay_order_id: orderId as string,
      razorpay_payment_id: paymentId as string,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("subscription insert failed", insErr);
      return json({ error: "Payment verified but the plan could not be saved. Contact support." }, 500);
    }

    console.log("payment verified + granted", planKey, paymentId, "until", expiresAt);
    return json({ success: true, payment_id: paymentId, order_id: orderId, plan: planKey, expires_at: expiresAt });
  } catch (err) {
    console.error("verify-payment failure", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
