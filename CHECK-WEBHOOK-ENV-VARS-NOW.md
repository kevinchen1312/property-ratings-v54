# Check Webhook Environment Variables

✅ Webhook deployed successfully with `--no-verify-jwt`!

## Next Steps to Fix 401 Errors

### Step 1: Verify Environment Variables in Supabase

Go to: **https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/functions**

Click on **"Edge Functions"** → **"Manage environment variables"**

Make sure ALL of these are set:

#### Required Variables:

1. **`STRIPE_SECRET_KEY`**
   - Value: Your Stripe secret key
   - Starts with: `sk_test_` (test mode) or `sk_live_` (live mode)
   - Where to find: https://dashboard.stripe.com/apikeys

2. **`STRIPE_WEBHOOK_SECRET`**
   - Value: Webhook signing secret
   - Starts with: `whsec_`
   - Where to find: https://dashboard.stripe.com/webhooks → Click your webhook → "Signing secret"

3. **`SUPABASE_URL`**
   - Value: `https://oyphcjbickujybvbeame.supabase.co`

4. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Value: Service role key (long string)
   - Where to find: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/api
   - Look for "service_role" key (NOT the anon key)

5. **`RESEND_API_KEY`** (for sending emails)
   - Value: Resend API key
   - Starts with: `re_`
   - Where to find: https://resend.com/api-keys

### Step 2: Verify Webhook URL in Stripe

Go to: **https://dashboard.stripe.com/webhooks**

1. Find your webhook endpoint (or create one if missing)

2. **URL should be EXACTLY:**
   ```
   https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
   ```

3. **Events to send:**
   - ✅ `checkout.session.completed`

4. **Copy the "Signing secret"** (if not already done)
   - Click "Reveal" next to "Signing secret"
   - Copy the value (starts with `whsec_`)
   - Add it to Supabase as `STRIPE_WEBHOOK_SECRET`

### Step 3: Test the Webhook from Stripe

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type: `checkout.session.completed`
5. Click **"Send test event"**
6. Look at the response:
   - ✅ **HTTP 200** = SUCCESS! Webhook is working
   - ❌ **HTTP 401** = Still has auth issues (recheck environment variables)
   - ❌ **HTTP 400** = Signature verification failed (wrong STRIPE_WEBHOOK_SECRET)
   - ❌ **HTTP 500** = Internal error (check Supabase logs)

### Step 4: Check Supabase Logs

Go to: **https://supabase.com/dashboard/project/oyphcjbickujybvbeame/logs/edge-functions**

Filter by: `stripeWebhook`

You should see logs like:
- `"Received webhook event: checkout.session.completed"`
- `"Processing successful checkout"`
- `"Successfully added X credits to user"`

### Step 5: Fix Pending Purchases

Once the webhook is working, manually complete the failed purchases:

```sql
-- Check how many purchases need fixing
SELECT 
    COUNT(*) as pending_count,
    SUM(credits) as total_credits_owed
FROM credit_purchase
WHERE status = 'pending';

-- Show details
SELECT 
    id,
    email,
    credits,
    amount,
    stripe_session_id,
    created_at
FROM credit_purchase
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Manually complete them all
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

-- Verify your credits
SELECT 
    'Your total credits:' as info,
    credits
FROM user_credits
WHERE user_id = auth.uid();
```

## 🎯 Quick Checklist

- [ ] Webhook deployed with `--no-verify-jwt` ✅ (DONE)
- [ ] `STRIPE_SECRET_KEY` set in Supabase
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Supabase
- [ ] `RESEND_API_KEY` set in Supabase (optional, for emails)
- [ ] Webhook URL in Stripe is correct
- [ ] Test webhook from Stripe shows HTTP 200
- [ ] Pending purchases manually completed
- [ ] Credits appear in user account

## 🚀 Expected Results After Fix

1. **Webhook responses:** HTTP 200 (not 401)
2. **Credit purchases:** Complete immediately and automatically
3. **User credits:** Updated within seconds of purchase
4. **Stripe events:** Show successful delivery in dashboard
5. **Supabase logs:** Show processing messages

## 💡 Pro Tip

After fixing, make a small test purchase (1 credit for $2.99) to verify the entire flow works end-to-end:
1. Purchase completes in Stripe ✅
2. Webhook fires automatically ✅
3. Credits appear in your account ✅
4. No 401 errors in Stripe dashboard ✅

---

Need help with any of these steps? Let me know!
