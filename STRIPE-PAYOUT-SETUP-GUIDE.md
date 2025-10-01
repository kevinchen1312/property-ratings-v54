# 💰 Stripe Payout Setup Guide

## ✅ Prerequisites Checklist

- [x] Revenue sharing working (payouts created in database)
- [x] Stripe account created
- [x] Stripe Express account connected
- [ ] Stripe Secret Key added to Edge Function
- [ ] Bank account added to Stripe Express
- [ ] Identity verification completed

---

## 🔑 Step 1: Add Stripe Secret Key to Supabase

### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Click **Edge Functions** in the left sidebar
3. Click on **`processPayouts`** function
4. Go to **"Settings"** tab
5. Under **"Secrets"**, click **"Add new secret"**
6. Add:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
7. Click **"Save"**

### Option B: Via Supabase CLI

```bash
# Set the secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Verify it's set
supabase secrets list
```

---

## 🏦 Step 2: Complete Your Stripe Express Account

### A. Add Bank Account

1. Go to your **Stripe Express Dashboard**: https://connect.stripe.com/express_login
2. Or click the **"Stripe Connection"** button in your app
3. Complete the onboarding:
   - Add **bank account details** (routing + account number)
   - Add **personal information** (name, address, DOB)
   - Add **tax information** (SSN or EIN)

### B. Verify Identity

Stripe will ask for:
- Government-issued ID (driver's license, passport)
- Proof of address (optional, for some accounts)

This usually takes **1-2 business days** to verify.

---

## 🧪 Step 3: Test Mode vs Live Mode

### Test Mode (Recommended First)

1. Use **test mode Stripe keys** (`sk_test_...`)
2. Use **test bank account**:
   - Routing: `110000000`
   - Account: `000123456789`
3. Payouts won't actually transfer real money
4. Perfect for testing the flow

### Live Mode (For Production)

1. Use **live mode Stripe keys** (`sk_live_...`)
2. Add your **real bank account**
3. Complete full identity verification
4. Actual money transfers to your bank account

---

## 🚀 Step 4: Deploy the Function

If you modified the function, redeploy it:

### Via Supabase Dashboard:
1. Go to **Edge Functions** → **processPayouts**
2. Click **"Deploy"**

### Via CLI:
```bash
supabase functions deploy processPayouts
```

---

## ✅ Step 5: Test the Complete Flow

### A. Reset Your Payout

```sql
-- Reset your failed payout to pending
UPDATE contributor_payouts
SET status = 'pending', paid_at = NULL, payout_reference = NULL
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'failed';
```

### B. Request Payout in App

1. Open your app
2. Go to **"My Earnings"** screen
3. You should see **$1.00 Available Balance**
4. Click **"Request Payout ($1.00)"**

### C. Check Results

**If successful**, you'll see:
- ✅ Success message in app
- ✅ Balance changes to $0.00
- ✅ Payout appears in history with status "paid"
- ✅ Money appears in your Stripe Express dashboard
- ✅ Money transfers to your bank in 2-7 days

**If it fails**, check:
- Supabase Edge Function logs for errors
- Stripe Dashboard → Logs for API errors
- Your Stripe Express account status

---

## 🔍 Troubleshooting

### Error: "Missing required environment variables"
**Fix**: Add `STRIPE_SECRET_KEY` to Edge Function secrets (Step 1)

### Error: "NO_STRIPE_ACCOUNT"
**Fix**: Click "Stripe Connection" button in app to create account

### Error: "PAYOUTS_NOT_ENABLED"
**Fix**: Complete Stripe Express onboarding (add bank + verify identity)

### Error: "MINIMUM_AMOUNT"
**Fix**: You need at least $1.00 to request payout

### Error: "STRIPE_TEST_..." or API error
**Fix**: 
- Check your Stripe key is correct
- Make sure it matches the mode (test vs live)
- Verify your Stripe Express account is in the same mode

---

## 📊 Verify Everything Works

### Check Database:
```sql
SELECT 
  cp.payout_amount,
  cp.status,
  cp.paid_at,
  cp.payout_reference,
  cp.payout_method
FROM contributor_payouts cp
WHERE cp.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
ORDER BY cp.created_at DESC;
```

### Check Stripe Dashboard:
1. Go to **Stripe Dashboard** → **Transfers**
2. You should see the transfer to your Express account
3. Amount should match your payout

### Check Stripe Express Dashboard:
1. Go to **https://connect.stripe.com/express_login**
2. Check **"Balance"** section
3. Should show the incoming transfer
4. Check **"Payouts"** for bank transfer status

---

## 💡 Important Notes

### Test Mode
- Uses fake money
- Perfect for development
- No real bank transfers
- Use test credentials

### Live Mode
- Uses real money
- Requires full verification
- Real bank transfers
- Use real bank account

### Transfer Timeline
- **Stripe Transfer**: Instant (to Express account balance)
- **Bank Payout**: 2-7 business days (Express balance → bank account)

### Fees
- **Standard pricing**: 2.9% + $0.30 per transaction
- **Stripe Connect fee**: Typically 0.25% (check your agreement)
- **You control**: How much to keep vs pay contributors

---

## 🎉 You're Done!

Once set up, the flow is:
1. User buys report → Revenue shared (automatic)
2. Contributor sees balance in app
3. Contributor clicks "Request Payout"
4. Money transfers via Stripe → Bank account

**No manual intervention needed!** 🚀

