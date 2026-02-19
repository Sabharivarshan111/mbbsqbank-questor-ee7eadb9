

## Razorpay UPI Payment Gateway Integration

### Overview
Integrate Razorpay to accept one-time UPI payments for unlocking premium content in your MBBS Question Bank. Your existing question bank UI and functionality will remain completely unchanged.

### How It Will Work

1. User clicks "Unlock Premium" button
2. Razorpay checkout opens (supports UPI, cards, wallets, net banking)
3. User pays via UPI (Google Pay, PhonePe, Paytm, etc.)
4. Payment is verified server-side via Supabase Edge Function
5. User gets access to premium content

### What You Need First

1. **Razorpay Account** - Sign up at [razorpay.com](https://razorpay.com)
2. **Razorpay Key ID** (publishable, starts with `rzp_test_` or `rzp_live_`)
3. **Razorpay Key Secret** (private, stored securely in Supabase secrets)

### Implementation Steps

#### Step 1: Store Razorpay Secret
- Add `RAZORPAY_KEY_SECRET` to Supabase Edge Function secrets
- Add `VITE_RAZORPAY_KEY_ID` to the codebase (this is a publishable key, safe to expose)

#### Step 2: Create Edge Function - `create-razorpay-order`
- **File**: `supabase/functions/create-razorpay-order/index.ts`
- Creates a Razorpay order with amount and currency (INR)
- Returns order ID to the frontend

#### Step 3: Create Edge Function - `verify-razorpay-payment`
- **File**: `supabase/functions/verify-razorpay-payment/index.ts`
- Verifies payment signature using Razorpay Key Secret
- Confirms payment is genuine and not tampered with

#### Step 4: Create Payment Component
- **File**: `src/components/RazorpayPayment.tsx`
- Loads Razorpay checkout script
- Shows a "Buy Premium Access" button
- Opens Razorpay payment modal on click
- Handles success/failure callbacks

#### Step 5: Add Payment Page
- **File**: `src/pages/Premium.tsx`
- Shows what premium features include
- Pricing details
- Payment button
- Route: `/premium`

#### Step 6: Update App.tsx
- Add route for `/premium` page

### Technical Details

**Razorpay Checkout Flow:**
1. Frontend calls `create-razorpay-order` edge function
2. Edge function creates order via Razorpay API, returns order ID
3. Frontend opens Razorpay checkout with order ID
4. User completes UPI payment
5. Frontend receives payment response
6. Frontend calls `verify-razorpay-payment` with payment details
7. Edge function verifies signature, confirms payment

**Files to Create (4):**
- `supabase/functions/create-razorpay-order/index.ts`
- `supabase/functions/verify-razorpay-payment/index.ts`
- `src/components/RazorpayPayment.tsx`
- `src/pages/Premium.tsx`

**Files to Modify (1):**
- `src/App.tsx` - Add premium route

**Secrets Needed:**
- `RAZORPAY_KEY_SECRET` - Stored in Supabase secrets (private)
- `RAZORPAY_KEY_ID` - Stored in code as env variable (publishable)

### Important Notes
- You can start with Razorpay **Test Mode** (free) to verify everything works before going live
- No changes to your existing question bank, AI chat, or any current features
- UPI payments are instant - users get access immediately after payment

