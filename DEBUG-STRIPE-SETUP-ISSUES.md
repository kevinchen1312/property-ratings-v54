# 🔧 Debug: Stripe Connection Loop - Step by Step Fix

## Current Problem
- App shows "Complete Account Setup" 
- Clicking it goes to Stripe but gets 404 error
- Logs still show `acct_demo_e30c2d2fcaa701cc2afc` (demo account)
- Stuck in loop

---

## ✅ Step-by-Step Fix (Do These IN ORDER)

### Step 1: Check Current State in Database

1. Go to: https://app.supabase.com/project/oyphcjbickujybvbeame/sql/new

2. Run this query:
```sql
-- Check what Stripe accounts exist
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  CASE 
    WHEN usa.stripe_account_id LIKE 'acct_demo_%' THEN '🧪 DEMO MODE'
    ELSE '💳 LIVE MODE'
  END as mode
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id;
```

**Expected Result:** Should show your demo account

---

### Step 2: DELETE the Demo Account

In the same SQL editor, run:
```sql
-- Delete ALL demo accounts
DELETE FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_demo_%';

-- Verify deletion
SELECT COUNT(*) as remaining_demo_accounts
FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_demo_%';
```

**Expected Result:** `remaining_demo_accounts = 0`

---

### Step 3: Verify Supabase Secrets Are Set

1. Go to: https://app.supabase.com/project/oyphcjbickujybvbeame/settings/functions

2. Check these secrets exist and are correct:
   - ✅ `STRIPE_SECRET_KEY` = starts with `sk_live_...`
   - ✅ `SUPABASE_URL` = `https://oyphcjbickujybvbeame.supabase.co`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)

**If any are missing or wrong, update them now!**

---

### Step 4: Redeploy Edge Functions

Open PowerShell in your project directory:

```powershell
# Deploy all three functions
npx supabase functions deploy createStripeConnectAccount --project-ref oyphcjbickujybvbeame

npx supabase functions deploy processPayouts --project-ref oyphcjbickujybvbeame

npx supabase functions deploy stripeConnectWebhook --project-ref oyphcjbickujybvbeame
```

**Expected Result:** Each should say "Deployed successfully"

---

### Step 5: Restart the Expo App

1. In your terminal where Expo is running, press `Ctrl+C`
2. Wait for it to fully stop
3. Run: `npm start`
4. Let it fully load
5. Reload the app on your phone (shake phone → Reload)

---

### Step 6: Test Stripe Connection (Fresh Start)

1. Open the app
2. Go to Earnings screen
3. Click "🔗 Stripe Connection"

**What Should Happen:**
- ✅ Opens Stripe Express onboarding
- ✅ Shows real Stripe form (not 404)
- ✅ Asks for real business/personal information
- ✅ Lets you connect a real bank account

**If you still get 404:**
- The old demo account wasn't deleted
- Or functions weren't redeployed
- Or app cache wasn't cleared

---

### Step 7: Force Clear App Cache (if Step 6 fails)

In your phone:
1. Shake device to open dev menu
2. Tap "Reload"
3. If that doesn't work, close and force-quit the Expo Go app
4. Reopen it and scan QR code again

---

## 🔍 How to Verify It's Fixed

After completing setup, check the database again:

```sql
-- Check new account
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  CASE 
    WHEN usa.stripe_account_id LIKE 'acct_demo_%' THEN '🧪 DEMO MODE'
    ELSE '💳 LIVE MODE'
  END as mode
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id;
```

**Should now show:**
- stripe_account_id = `acct_` (WITHOUT "demo")
- mode = "💳 LIVE MODE"

---

## 🚨 Still Having Issues?

If you're still stuck after doing ALL 7 steps:

1. **Check function logs:**
   ```powershell
   npx supabase functions logs createStripeConnectAccount --project-ref oyphcjbickujybvbeame
   ```

2. **Check for errors in logs:**
   - Look for "401 Unauthorized"
   - Look for "Invalid API key"
   - Look for "Connect not enabled"

3. **Verify Stripe Connect is enabled:**
   - Go to: https://dashboard.stripe.com/settings/connect
   - Make sure it's enabled
   - Make sure Express accounts are enabled

---

## 📋 Checklist

Use this to make sure you did everything:

- [ ] Step 1: Checked database - saw demo account
- [ ] Step 2: Deleted demo account from database
- [ ] Step 3: Verified all Supabase secrets are set correctly
- [ ] Step 4: Redeployed all 3 functions successfully
- [ ] Step 5: Restarted Expo app and reloaded on phone
- [ ] Step 6: Tested Stripe connection - should work now
- [ ] Step 7: (Only if needed) Force cleared app cache

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ No more 404 errors
- ✅ Stripe shows real onboarding form
- ✅ Can complete setup with real bank info
- ✅ Database shows `acct_` (not `acct_demo_`)
- ✅ App no longer shows "Complete Account Setup" loop

---

**Follow these steps IN ORDER and it should work!**
