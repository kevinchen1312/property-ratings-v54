# Fix Webhook 401 Errors

You're getting 401 errors because Supabase Edge Functions require authentication by default, but Stripe webhooks can't send auth headers.

## 🔍 The Problem

Stripe webhooks are being rejected with 401 UNAUTHORIZED before they even reach your webhook handler code.

## ✅ Solution: Deploy with Correct Configuration

### Step 1: Redeploy the Webhook Function

The function needs to be deployed as a public endpoint that doesn't require JWT verification:

```bash
# Navigate to your project directory
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"

# Deploy the webhook function with no verification
npx supabase functions deploy stripeWebhook --no-verify-jwt
```

**Important:** The `--no-verify-jwt` flag tells Supabase to allow unauthenticated requests to this function, which is necessary for webhooks from external services like Stripe.

### Step 2: Verify Environment Variables in Supabase

Go to: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/functions

Make sure these are ALL set:

- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe (starts with `whsec_`)
- ✅ `SUPABASE_URL` - Your Supabase URL (https://oyphcjbickujybvbeame.supabase.co)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key (found in project settings)
- ✅ `RESEND_API_KEY` - Resend API key for emails (starts with `re_`)

### Step 3: Verify Webhook URL in Stripe

Go to: https://dashboard.stripe.com/webhooks

1. Find your webhook endpoint
2. **Verify the URL is EXACTLY:**
   ```
   https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
   ```
3. Make sure these events are selected:
   - `checkout.session.completed`
4. **Copy the webhook signing secret** (starts with `whsec_`)
5. Add it to Supabase environment variables as `STRIPE_WEBHOOK_SECRET`

### Step 4: Test the Webhook

After redeploying:

1. **From Stripe Dashboard:**
   - Go to your webhook endpoint
   - Click "Send test webhook"
   - Select `checkout.session.completed`
   - Click "Send test event"
   - Should see HTTP 200 response (not 401)

2. **With a Real Purchase:**
   - Make a small test purchase
   - Watch the Supabase logs: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/logs/edge-functions
   - Should see webhook processing logs
   - Should see credits added to your account

### Step 5: Fix Existing Failed Purchases

After the webhook is working, fix the purchases that failed:

```sql
-- See how many failed purchases you have
SELECT 
    COUNT(*) as pending_purchases,
    SUM(credits) as total_missing_credits
FROM credit_purchase
WHERE status = 'pending';

-- Manually complete them
DO $$
DECLARE
  pending_rec RECORD;
  result_val BOOLEAN;
BEGIN
  FOR pending_rec IN 
    SELECT stripe_session_id, credits, email
    FROM credit_purchase 
    WHERE status = 'pending'
    ORDER BY created_at
  LOOP
    BEGIN
      RAISE NOTICE 'Processing: % credits for %', pending_rec.credits, pending_rec.email;
      SELECT complete_credit_purchase(pending_rec.stripe_session_id) INTO result_val;
      
      IF result_val THEN
        RAISE NOTICE '✅ SUCCESS: Added % credits', pending_rec.credits;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR: %', SQLERRM;
    END;
  END LOOP;
END $$;

-- Verify credits were added
SELECT 
    'Your updated credits:' as info,
    credits
FROM user_credits
WHERE user_id = auth.uid();
```

## 🎯 Quick Command Summary

```bash
# 1. Redeploy webhook (CRITICAL - fixes 401 errors)
npx supabase functions deploy stripeWebhook --no-verify-jwt

# 2. Check deployment
npx supabase functions list

# 3. Test webhook from Stripe Dashboard
# → Send test webhook → checkout.session.completed

# 4. Watch logs
# → Go to Supabase dashboard → Edge Functions → Logs
```

## 🔍 How to Verify It's Fixed

After redeploying:

1. **Check Stripe webhook events** (Dashboard → Webhooks → Your endpoint → Recent events)
   - Before fix: ❌ HTTP 401 errors
   - After fix: ✅ HTTP 200 success

2. **Make a small test purchase**
   - Should complete immediately
   - Credits should appear in your account
   - Should see success logs in Supabase

3. **Check Supabase Edge Function logs**
   - Should see: `"Processing successful checkout"`
   - Should see: `"Successfully added X credits to user"`
   - No 401 errors

## 🚨 Common Mistakes

### ❌ Forgetting `--no-verify-jwt`
If you deploy without this flag, webhooks will still get 401 errors.

**Fix:** Redeploy with the flag:
```bash
npx supabase functions deploy stripeWebhook --no-verify-jwt
```

### ❌ Wrong Webhook URL
Make sure Stripe is calling the correct URL.

**Correct:** `https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook`
**Wrong:** `https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhookPublic`

### ❌ Missing STRIPE_WEBHOOK_SECRET
The webhook will fail signature verification without this.

**Fix:** Copy the signing secret from Stripe Dashboard and add it to Supabase environment variables.

## 📊 Expected Results

- ✅ Webhook responds with HTTP 200
- ✅ Credits are added immediately after purchase
- ✅ No more 401 errors in Stripe dashboard
- ✅ Purchases show "completed" status in database
- ✅ User credits are updated correctly

## Need Help?

If you still see 401 errors after redeploying:

1. Check the exact URL in Stripe matches your Supabase project URL
2. Verify the function shows up in `npx supabase functions list`
3. Check Supabase logs for any error messages
4. Make sure you're testing with the correct Stripe API keys (test vs live)
