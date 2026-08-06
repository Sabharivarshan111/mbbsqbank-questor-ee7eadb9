# Google Play Billing for the Android app (Razorpay stays for web)

Goal: inside the Play Store app, digital purchases (FM + SPM notes, ad-free) go through Google Play Billing. On the web, Razorpay keeps working exactly as today. Both paths write to the same `premium_subscriptions` table, so a user who paid either way is unlocked everywhere.

```text
Android app  -> Play Billing  -> play-verify-purchase (edge fn) -> premium_subscriptions
Web browser  -> Razorpay      -> razorpay-verify-payment        -> premium_subscriptions
```

## Part A — What you do in Google Play Console (manual, do this first)

1. Play Console > your app > Monetize > Products > **In-app products** > Create product.
   - Product ID: `notes_fmspm`, name "FM + SPM revision notes", price Rs 50. Activate it.
2. Monetize > Products > **Subscriptions** > Create subscription.
   - Product ID: `adfree_monthly`, base plan ID `monthly`, billing period 1 month, price Rs 50, auto-renewing. Activate it.
3. Monetize setup > confirm a payments profile exists (needed before products can be sold).
4. Google Cloud Console (same account): create a **service account**, download its JSON key.
5. Play Console > Users and permissions > Invite the service account email > grant "View financial data" + "Manage orders and subscriptions" for this app.
6. Google Cloud Console > enable **Google Play Android Developer API** for that project.
7. Play Console > Setup > License testing: add your own Gmail plus any tester emails so you can buy without being charged.
8. Upload the new build to the **Internal testing** track. Play Billing only works for builds installed from Play — it will never work in the Lovable web preview.

Once you have the service-account JSON, I will ask you to save it as a secret (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`); nothing goes into the codebase.

## Part B — What I build in the app

1. **Database migration** on `premium_subscriptions`:
   - add `source text not null default 'razorpay'` ('razorpay' | 'play'), `play_purchase_token text`, `play_product_id text`
   - unique index on `play_purchase_token` so the same Play purchase can never be credited twice
   - make `razorpay_order_id` / `razorpay_payment_id` nullable if they are not already
2. **New edge function `play-verify-purchase`**: takes `{ productId, purchaseToken }` from the app, requires a signed-in Supabase user, mints a Google OAuth token from the service-account JSON, then calls
   - `purchases.products.get` for `notes_fmspm` (checks `purchaseState = 0`), or
   - `purchases.subscriptionsv2.get` for `adfree_monthly` (reads `expiryTime`)
   On success it inserts/updates the entitlement row with the service role (lifetime for notes, the real Play expiry for ad-free) and acknowledges the purchase with Google so it is not auto-refunded after 3 days. Duplicate tokens return the existing entitlement instead of a second row.
3. **Billing plugin**: install `cordova-plugin-purchase` (works with Capacitor, no native code to write) and add a `src/lib/play-billing.ts` wrapper that registers the two products, launches the purchase flow, and hands the purchase token to the edge function.
4. **Platform-aware purchase layer**: a single `usePurchase()` hook. `isNative()` (already in `src/lib/native-auth.ts`) decides Play Billing vs Razorpay. `PremiumNotesCard` and `RemoveAdsButton` call the hook instead of `useRazorpayTestCheckout` directly, so the UI, warnings and unlock behaviour stay the same.
5. **Play policy compliance inside the app**: in the native build the checkout sheet drops the UPI/Razorpay/WhatsApp-reference wording and shows Play's own price string; the web build keeps today's copy. No text in the app may point users to the website to pay — that alone can get an app removed.
6. **Restore purchases**: a small "Restore purchases" action in the native build that re-queries owned Play products and re-verifies them, for reinstalls or new devices.
7. **Admin card**: `AdminSubscribersCard` gains a Play/Razorpay badge and shows the Play order/token id so you can cross-check in Play Console > Orders.
8. **Entitlement reads unchanged**: `use-premium.ts`, `use-notes-purchase.ts`, `isPremiumCached()` and the ad layer keep working as-is because both payment paths land in the same table.

## Part C — Ship and verify

1. `git pull`, `npm install`, `npx cap sync`, build a signed AAB, upload to Internal testing.
2. Install from the Play test link with a license-tester account, buy both products, confirm the notes Drive button unlocks and ads stop.
3. Check the `premium_subscriptions` row has `source = 'play'` and the expected expiry, and that the purchase appears in your admin card.
4. Confirm the web app still charges through Razorpay and unlocks the same account.

## Things to know

- Play takes 15% (small-business rate, under $1M/yr) instead of Razorpay's ~2%.
- Play Billing cannot be tested in the browser preview or in a debug APK installed by cable; it needs a Play-installed build and a license-tester account.
- Existing Razorpay buyers keep their access; nothing is migrated.
- `adfree_monthly` becomes a real auto-renewing Play subscription for Android buyers, so renewals and cancellations are handled by Google. Server-side webhook handling for renewals can be added later; until then the app re-verifies on launch and picks up the new expiry.
