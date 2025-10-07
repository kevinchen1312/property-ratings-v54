# ✅ Webhook Fix Complete - What to Do Next

## What I Fixed

✅ **Redeployed the webhook with `--no-verify-jwt`** - This allows Stripe to send webhooks without authentication, which was causing the 401 errors.

## What You Need to Do Now

### 1️⃣ Verify Environment Variables (2 minutes)

Go to: **https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/functions**

Make sure these are ALL set:

| Variable | What It Is | Where to Get It |
|----------|-----------|-----------------|
| `STRIPE_SECRET_KEY` | Your Stripe API key | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (starts with `whsec_`) | https://dashboard.stripe.com/webhooks → Click webhook → "Signing secret" |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/api |
| `RESEND_API_KEY` | Email API key (optional) | https://resend.com/api-keys |

**CRITICAL:** If `STRIPE_WEBHOOK_SECRET` is missing or wrong, the webhook will still fail!

### 2️⃣ Test the Webhook (1 minute)

Go to: **https://dashboard.stripe.com/webhooks**

1. Click on your webhook endpoint
2. Click **"Send test webhook"**
3. Select: `checkout.session.completed`
4. Click **"Send test event"**

**Expected result:**
- ✅ HTTP 200 = SUCCESS! The fix worked!
- ❌ HTTP 401 = Need to check environment variables
- ❌ HTTP 400 = Wrong `STRIPE_WEBHOOK_SECRET`

### 3️⃣ Fix Your Pending Purchases (5 minutes)

After confirming the webhook works, run this SQL to credit all your failed purchases:

```sql
-- First, check what needs fixing
SELECT 
    COUNT(*) as pending_purchases,
    SUM(credits) as total_credits_owed
FROM credit_purchase
WHERE status = 'pending';

-- Then run the fix (copy from fix-all-pending-purchases.sql)
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

-- Verify your new balance
SELECT 
    'Your credits:' as info,
    credits
FROM user_credits
WHERE user_id = auth.uid();
```

### 4️⃣ Test with a New Purchase (Optional)

Make a small test purchase (1 credit) to verify the entire flow:

1. Make purchase in your app
2. Credits should appear **immediately** (within 5 seconds)
3. Check Stripe webhook events - should show HTTP 200
4. Check Supabase logs - should show processing messages

## Why You Got 401 Errors

Supabase Edge Functions require authentication by default. When Stripe tried to send webhooks, Supabase rejected them with 401 UNAUTHORIZED before your code even ran.

The fix: Deploy with `--no-verify-jwt` flag, which tells Supabase "this endpoint is public and doesn't need authentication."

## Files Created

- `FIX-WEBHOOK-401-ERRORS.md` - Detailed fix guide
- `CHECK-WEBHOOK-ENV-VARS-NOW.md` - Environment variables checklist
- `fix-all-pending-purchases.sql` - SQL to fix failed purchases
- `WEBHOOK-FIX-COMPLETE-SUMMARY.md` - This summary

## Quick Verification Checklist

- [x] Webhook redeployed with `--no-verify-jwt` ✅ DONE
- [ ] Environment variables set in Supabase
- [ ] Test webhook sends HTTP 200 from Stripe
- [ ] Pending purchases manually completed
- [ ] Credits show in user account

## Need Help?

If you still see 401 errors after checking environment variables:

1. Double-check the webhook URL in Stripe is exactly:
   ```
   https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
   ```

2. Make sure you copied the webhook signing secret correctly (it's long and starts with `whsec_`)

3. Check Supabase Edge Function logs for error messages:
   https://supabase.com/dashboard/project/oyphcjbickujybvbeame/logs/edge-functions

## Expected Timeline

- **Now:** 401 errors should stop (webhook accepts requests)
- **After env vars:** Webhook processes successfully 
- **After manual fix:** All your credits are restored
- **Going forward:** Purchases complete automatically

You should be back up and running in ~10 minutes! 🚀
