# Check Stripe Webhook Setup

The webhook was deployed but shows no logs, which means Stripe isn't calling it.

## Step 1: Check if Webhook is Configured in Stripe

1. Go to: https://dashboard.stripe.com/webhooks
2. Look for a webhook endpoint
3. Check if the URL matches your Supabase function URL

**Expected URL format:**
```
https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
```

## Step 2: If Webhook Doesn't Exist - Create It

1. Click **"Add endpoint"**
2. **Endpoint URL:** 
   ```
   https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
   ```
3. **Events to send:** Select `checkout.session.completed`
4. Click **"Add endpoint"**
5. **Copy the Signing Secret** (starts with `whsec_...`)

## Step 3: Add Webhook Secret to Supabase

The webhook needs the signing secret to verify requests from Stripe.

1. Go to: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/functions
2. Add environment variable:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (the signing secret from Stripe)
3. Click **Save**

## Step 4: Verify Other Environment Variables

Make sure these are also set in Supabase Edge Functions settings:

- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_live_...` or `sk_test_...`)
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_...`)
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key

## Step 5: Test the Webhook

After configuring:

1. **Make a test purchase**
2. Go to Stripe Dashboard → Webhooks → Your endpoint
3. Look at **"Recent events"** 
4. Should see `checkout.session.completed` events
5. Click on an event to see:
   - ✅ HTTP 200 = Success
   - ❌ HTTP 500 = Error (but will retry)
   - ⚠️ HTTP 400 = Configuration issue

## Step 6: Manual Webhook Test

You can test the webhook from Stripe:

1. Go to your webhook endpoint in Stripe Dashboard
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test event"**
5. Check if it appears in Supabase logs

## Quick Diagnostic

Run this to see recent purchases that might need webhook processing:

```sql
-- Check for purchases without webhook processing
SELECT 
    'PURCHASES AWAITING WEBHOOK' as section,
    COUNT(*) as count
FROM credit_purchase
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Show details
SELECT 
    id,
    email,
    credits,
    status,
    stripe_session_id,
    created_at
FROM credit_purchase
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Common Issues

### Issue: "Invalid signature" errors in Stripe
**Cause:** Wrong `STRIPE_WEBHOOK_SECRET` in Supabase
**Fix:** Double-check the signing secret matches exactly

### Issue: No events showing in Stripe
**Cause:** Webhook URL is wrong or not saved
**Fix:** Verify the URL is exactly: `https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook`

### Issue: 404 errors in Stripe
**Cause:** Function not deployed or wrong URL
**Fix:** Re-run `npx supabase functions deploy stripeWebhook`

### Issue: Webhook receives events but credits don't add
**Cause:** Database function or permissions issue
**Fix:** Check Supabase function logs for detailed errors

## Next Steps

1. ✅ Check if webhook exists in Stripe
2. ✅ Verify webhook URL is correct
3. ✅ Ensure STRIPE_WEBHOOK_SECRET is set in Supabase
4. ✅ Test with a small purchase
5. ✅ Check both Stripe webhook logs AND Supabase function logs
