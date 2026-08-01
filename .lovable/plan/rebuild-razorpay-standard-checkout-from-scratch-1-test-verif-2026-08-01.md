# Rebuild Razorpay Standard Checkout from scratch (₹1 test, verification only)

## What stays the same

- The card in the daily-ad popup keeps showing **"Ad-free plan — coming soon"**, greyed out, with no hint of the hidden gesture.
- A quick **double tap** on that card still runs the real checkout.
- No ad logic, no daily-ad buckets, no Google gate card are touched.

## What changes

- Amount becomes **₹1 (100 paise)** — the smallest amount Razorpay accepts — because this flow exists only to prove the integration works.
- **No entitlement.** A successful, signature-verified payment shows a success toast only. Nothing is written to `premium_subscriptions`, no ads are turned off, and the "30 days ad-free" wording disappears.
- Both edge functions are rewritten ground-up to match the official Standard Checkout steps: create order → open modal → verify HMAC signature server-side.

## Why the previous attempt failed (to confirm first, not assumed)

The Supabase logs for `razorpay-create-order` are **completely empty** — not a single invocation is recorded. So the earlier "non-2xx" was raised before any of our function code ran, or the function was never truly live. That rules nothing in yet, so build step 1 is verification, not a guess:

1. Store the new keys (`rzp_test_TKLvZgR4rVwWo6` / secret) so the credentials in Supabase definitely match the Razorpay account shown in your dashboard. A key/secret from a different or rotated account would make Razorpay reject order creation with 401 and our function would surface a 500 — a strong candidate given the fresh keys you just pasted.
2. Deploy the rewritten functions and call `razorpay-create-order` directly, once unauthenticated and once with a real signed-in token.
3. Read the logs again. The real status and Razorpay body get surfaced verbatim in the UI toast, so any remaining failure is readable instead of "non-2xx".

## Flow after the rebuild

```text
double tap "coming soon" card
  -> sign in with Google if not signed in
  -> razorpay-create-order   (amount fixed server-side at 100 paise)
       POST https://api.razorpay.com/v1/orders  with Basic auth
       returns { order_id, amount, currency, key_id }
  -> Razorpay checkout.js modal opens with that order_id
  -> success -> razorpay-verify-payment
       HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
       constant-time compare with razorpay_signature
       match -> { success: true }   mismatch -> 400, rejected
  -> toast: "Test payment verified" (or the exact server error)
```

Cancel / `payment.failed` both surface their own message. Amount and currency are never read from the client.

## How you check a payment landed

Razorpay Dashboard → **Transactions → Payments**: the ₹1 test payment appears with its payment id and `captured` status. Since we are not storing entitlements this pass, the dashboard is the single source of truth. If you later want real subscriptions back, that's a separate pass and I'd reuse `premium_subscriptions`.

## Technical notes

- `supabase/functions/razorpay-create-order/index.ts` — rewritten. Zod-validated body, requires a signed-in Supabase user, `PLAN.amountPaise = 100`, guards `amount >= 100`, returns Razorpay's own status/body text on failure, CORS on every response.
- `supabase/functions/razorpay-verify-payment/index.ts` — rewritten. Signature verification only: no `premium_subscriptions` insert, no service-role client. 400 on mismatch or missing fields, 401 without a valid JWT.
- `src/hooks/use-premium.ts` → replaced by `src/hooks/use-razorpay-test-checkout.ts`: loads `checkout.js`, invokes both functions, reads the real error body out of `FunctionsHttpError.context`. Ad-free state tracking is dropped.
- `src/components/RemoveAdsButton.tsx` — same "coming soon" look and `useDoubleTap` trigger; wired to the new hook, price text removed.
- `src/components/DailyAdConsent.tsx` — unchanged apart from the premium-state props the button no longer needs.
- Keys stay server-side only via the existing `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` Supabase secrets (updated to the new values). `key_id` reaches the browser only in the create-order response, which is the documented pattern; the secret never leaves the edge function. No `.env` entry, no npm SDK — Deno edge functions call the REST API directly.
- `premium_subscriptions` and `is_premium()` are left in place, unused, so nothing breaks and a future subscription pass can pick them back up.
