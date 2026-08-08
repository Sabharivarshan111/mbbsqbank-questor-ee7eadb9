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

/**
 * "Already paid but nothing unlocked?" recovery.
 * Looks up the signed-in user's captured Razorpay payments (matched on the email
 * used at checkout) and, if one is found, grants the notes + ad-free bundle.
 * This covers the case where the app/webview closed before the verify step ran.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Razorpay keys are not configured." }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "Not signed in." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Session expired. Sign in again." }, 401);
    const email = (user.email ?? "").toLowerCase();
    if (!email) return json({ error: "Sign in with Google so the payment can be matched to your email." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Already granted?
    const { data: already } = await admin
      .from("premium_subscriptions")
      .select("id, plan, expires_at")
      .eq("user_id", user.id)
      .eq("plan", "notes_fmspm")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (already) return json({ success: true, already: true, restored: false });

    // Scan the last 60 days of payments for a captured ₹50 payment from this email.
    const from = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);
    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    let found: any = null;
    for (let skip = 0; skip < 300 && !found; skip += 100) {
      const res = await fetch(
        `https://api.razorpay.com/v1/payments?count=100&skip=${skip}&from=${from}`,
        { headers: { Authorization: auth } },
      );
      if (!res.ok) {
        console.error("razorpay payments fetch failed", res.status, await res.text());
        return json({ error: "Could not reach Razorpay. Try again in a minute." }, 502);
      }
      const body = await res.json() as { items?: any[] };
      const items = body.items ?? [];
      found = items.find((p) =>
        (p.status === "captured" || p.status === "authorized") &&
        p.amount >= 5000 &&
        String(p.email ?? "").toLowerCase() === email
      ) ?? null;
      if (items.length < 100) break;
    }

    if (!found) {
      return json({
        success: false,
        restored: false,
        error: "No completed ₹50 payment was found for this email. Send your payment screenshot to 9080220563 on WhatsApp.",
      }, 404);
    }

    // Avoid double-granting the same payment.
    const { data: dupe } = await admin
      .from("premium_subscriptions")
      .select("id")
      .eq("razorpay_payment_id", found.id)
      .limit(1)
      .maybeSingle();

    const lifetimeAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const adfreeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const common = {
      user_id: user.id,
      email: user.email ?? null,
      razorpay_order_id: found.order_id ?? null,
      razorpay_payment_id: found.id as string,
    };

    if (dupe) {
      // Payment already used by another account — still safe to grant to the email owner.
      console.warn("payment already recorded, granting to email owner", found.id);
    }

    // razorpay_payment_id is unique — suffix the bundled bonus row.
    const rows = [
      { ...common, plan: "notes_fmspm", amount_paise: found.amount, expires_at: lifetimeAt },
      { ...common, plan: "adfree_monthly", amount_paise: 0, expires_at: adfreeAt,
        razorpay_payment_id: `${found.id}:adfree` },
    ];
    let saved = 0;
    for (const row of rows) {
      const { error } = await admin.from("premium_subscriptions").insert(row);
      if (error) console.error("restore insert failed", row.plan, error);
      else saved++;
    }
    if (saved === 0) {
      return json({ error: "Payment found but access could not be saved. Contact support." }, 500);
    }

    console.log("purchase restored", email, found.id);
    return json({ success: true, restored: true, payment_id: found.id, adfree_until: adfreeAt });
  } catch (err) {
    console.error("restore failure", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});
