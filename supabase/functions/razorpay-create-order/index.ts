import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Both products are ₹50. Amount is fixed server-side. */
const PLANS: Record<string, { amount: number; label: string }> = {
  adfree_monthly: { amount: 5000, label: "Ad-free — 1 month" },
  notes_fmspm: { amount: 5000, label: "FM + SPM revision notes" },
};
const CURRENCY = "INR";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Razorpay keys are not configured." }, 500);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const planKey = typeof body?.plan === "string" ? body.plan : "adfree_monthly";
    const plan = PLANS[planKey];
    if (!plan) return json({ error: "Unknown plan." }, 400);

    // Signed-in Supabase user required so the order can be attributed.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Please sign in before paying." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Your session expired. Sign in again." }, 401);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: CURRENCY,
        receipt: `${planKey.slice(0, 12)}_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, purpose: planKey },
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`razorpay order failed [${res.status}]: ${text}`);
      return json(
        { error: `Razorpay rejected the order (${res.status}): ${text}` },
        res.status === 401 ? 401 : 502,
      );
    }

    const order = JSON.parse(text);
    console.log("order created", order.id, order.amount, planKey);
    return json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      plan: planKey,
      label: plan.label,
    });
  } catch (err) {
    console.error("create-order failure", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
