# Sign-in gate, hidden Razorpay test card, and owner subscription visibility

## 1. "Remove ads — ₹50 / 1 month" becomes a fake "Coming soon" card

- The card in the daily-ad popup shows **"Ad-free plan — coming soon"**, greyed out, non-clickable-looking.
- A **double tap** on that card silently runs the real Razorpay checkout (your hidden test path). Nothing in the UI hints at the double tap.
- Single tap does nothing (or shows the same "coming soon" text).
- Everything else in the daily-ad popup stays exactly as it is — the "Sorry for the inconvenience" card, the OK button, and all three daily ad buckets (progress / theme / essay-short-note) are untouched.

## 2. Why checkout returned a non-2xx error

Checked the Supabase edge function logs for `razorpay-create-order`: **there are zero log entries**, which means the request never reached the function body. That points at deploy/routing, not at the Razorpay keys (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are both present in project secrets). This is not yet a confirmed root cause, so the first build step is to verify it directly:

1. Redeploy both functions and call `razorpay-create-order` directly with a signed-in token.
2. Read the logs again and fix whatever the real failure is (missing deploy, JWT rejection, or a Razorpay API error).
3. Surface the actual server message in the UI instead of the generic "non-2xx" string, so future failures are readable.

No Lovable Cloud / Lovable AI is used anywhere in this flow — only your Supabase project and your own Razorpay keys.

## 3. How payment works and how you (owner) see who subscribed

Flow:

```text
user double-taps card
  -> razorpay-create-order (edge fn, uses your key secret)
       creates an order for ₹50, tagged with the user's Supabase user_id
  -> Razorpay checkout opens in the app
  -> on success Razorpay returns order_id + payment_id + signature
  -> razorpay-verify-payment (edge fn) recomputes the HMAC signature
       with your key secret; only if it matches does it write the row
  -> row inserted into premium_subscriptions (service role only)
       user_id, email, plan, amount_paise, payment id, expires_at = now + 30 days
```

The client can never grant itself premium — the table is insert-locked to the service role, and users can only read their own row.

To see subscribers, you have two options; the plan builds the first and you can ask for the second later:

- **Supabase dashboard** — open the `premium_subscriptions` table and you see every payer: email, payment id, amount, start and expiry. Sorting by `created_at` gives today's sales; filtering `expires_at > now()` gives currently-active subscribers. This works today with no extra code.
- **Optional in-app owner screen** — a hidden admin list inside Orbit showing the same rows. This needs a proper admin role table, so it's out of scope for this pass unless you ask.

## 4. New card in the essay / short-note section (only for users not signed in with Google)

Shown above the essay / short-notes list when the user is anonymous. It contains:

- We've crossed **1000+ users**. To prevent spam, please sign in with Google.
- Signing in is a **one-time** step — all your existing progress, XP, streak and notes are carried over automatically.
- **You will not see any ad for signing in with Google.**
- If the user has no display name yet, the card also asks for a name and saves it before sign-in.
- Warning block: you must be using the **Orbit MBBS app from the Play Store**, on the **latest version**. Search "Orbit MBBS" on the Play Store and install it. If you are on an unofficial build or an older version, update from the Play Store.

The Google button reuses the exact sign-in logic already working in My Progress (native Chrome Custom Tabs on Android, `linkIdentity` with `signInWithOAuth` fallback on web) so anonymous progress is preserved. Once signed in, the card disappears.

**No ad is triggered by this card.** The existing once-per-day "Sorry for the inconvenience" ad on opening essays/short notes keeps working exactly as it does now, before and after sign-in.

## Technical notes

- `src/components/RemoveAdsButton.tsx` — becomes a "coming soon" surface with a double-tap handler (reuse `useDoubleTap`) that calls the existing `startCheckout()` from `use-premium`.
- `src/hooks/use-premium.ts` — surface the real error text from the edge function response.
- `supabase/functions/razorpay-create-order` / `razorpay-verify-payment` — redeploy, verify via logs, no logic rewrite expected.
- New `src/components/GoogleGateCard.tsx` — extracts the sign-in logic from `progress/GoogleSyncButton.tsx` plus name capture and the Play Store warning; rendered in `src/components/shell/BrowseTab.tsx` in the essay/short-note view for anonymous users.
- `src/lib/daily-ad.ts` and all `requestDailyAd` call sites are left unchanged.
