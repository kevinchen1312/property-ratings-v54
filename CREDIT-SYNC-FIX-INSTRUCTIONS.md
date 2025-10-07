# Credit Sync Issue - Fix Instructions

## Problem Summary

Credits weren't always syncing after purchase due to two critical issues:

1. **Permanent Failure State**: The `complete_credit_purchase` function would mark purchases as `'failed'` on the first error, preventing any retries.

2. **Silent Failures**: The webhook handler returned HTTP 200 even on failures, telling Stripe "all good" when credits weren't actually added.

## What Was Fixed

### 1. Updated Database Function (`fix-credit-sync-issue.sql`)

The new `complete_credit_purchase` function now:

- **Allows retries**: Doesn't immediately mark purchases as failed
- **Tracks retry attempts**: Uses metadata to count retries (fails after 3 attempts)
- **Handles idempotency**: Can be called multiple times safely
- **Auto-recovers**: Can retry previously failed purchases
- **Better logging**: Uses RAISE NOTICE and RAISE WARNING for debugging

### 2. Updated Webhook Handler (`supabase/functions/stripeWebhook/index.ts`)

The webhook now:

- **Returns 500 on failure**: Lets Stripe retry with exponential backoff
- **Better error logging**: Logs detailed error information
- **Explicit success responses**: Returns detailed JSON on success
- **Try-catch wrapper**: Catches and logs exceptions properly

## Deployment Steps

### Step 1: Update the Database Function

Run this in your Supabase SQL editor:

```bash
# Navigate to Supabase dashboard > SQL Editor
# Copy and run: fix-credit-sync-issue.sql
```

This will:
- Replace the `complete_credit_purchase` function with the new version
- Add a `retry_failed_credit_purchase` function for manual retries
- Show any failed purchases that need attention

### Step 2: Deploy the Updated Webhook

```bash
# Navigate to your project directory
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"

# Deploy the updated webhook function
npx supabase functions deploy stripeWebhook
```

### Step 3: Check for Failed Purchases

Run the diagnostic script:

```bash
# In Supabase SQL Editor, run:
# debug-credit-sync-issue.sql
```

This will show:
- Recent purchases and their status
- Any failed purchases
- Stuck pending purchases
- Discrepancies between purchases and actual credits

### Step 4: Retry Failed Purchases (if any)

If you find failed purchases, you can manually retry them:

```sql
-- Replace with actual stripe_session_id from failed purchase
SELECT retry_failed_credit_purchase('cs_test_...');
```

Or retry all failed purchases at once:

```sql
-- Retry all failed purchases
DO $$
DECLARE
  failed_purchase RECORD;
  retry_result BOOLEAN;
BEGIN
  FOR failed_purchase IN 
    SELECT stripe_session_id 
    FROM credit_purchase 
    WHERE status = 'failed'
    ORDER BY created_at
  LOOP
    BEGIN
      SELECT retry_failed_credit_purchase(failed_purchase.stripe_session_id) INTO retry_result;
      RAISE NOTICE 'Retried %: %', failed_purchase.stripe_session_id, retry_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to retry %: %', failed_purchase.stripe_session_id, SQLERRM;
    END;
  END LOOP;
END $$;
```

## Testing

### Test 1: Normal Purchase Flow

1. Go to your app and purchase credits
2. Check Stripe webhook events (should see `checkout.session.completed`)
3. Check the webhook logs in Supabase:
   - Should see "🛒 Processing credit purchase"
   - Should see "✅ Successfully added X credits to user"
4. Verify credits appear in your account immediately

### Test 2: Retry on Transient Failure

1. Temporarily cause a failure (e.g., RLS issue)
2. Purchase credits
3. Check webhook logs - should see:
   - First attempt: "❌ Failed to complete credit purchase"
   - Stripe will retry automatically (with delays: 1m, 5m, 30m, etc.)
   - Subsequent attempt should succeed once issue is resolved

### Test 3: Failed Purchase Recovery

```sql
-- Create a test failed purchase
INSERT INTO credit_purchase (user_id, email, package_id, credits, amount, status, stripe_session_id)
VALUES (
  auth.uid(),
  'test@example.com',
  'test',
  10,
  5.00,
  'failed',
  'test_session_' || gen_random_uuid()
)
RETURNING stripe_session_id;

-- Retry it
SELECT retry_failed_credit_purchase('test_session_...');

-- Verify credits were added
SELECT * FROM user_credits WHERE user_id = auth.uid();
```

## Monitoring

### Watch for Issues

```sql
-- Run periodically to check for problems
SELECT 
  status,
  COUNT(*) as count,
  SUM(credits) as total_credits,
  MAX(created_at) as most_recent
FROM credit_purchase
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Check Webhook Logs in Stripe

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click on your webhook endpoint
3. View recent events
4. Look for:
   - ✅ HTTP 200 responses = success
   - ⚠️ HTTP 500 responses = retry in progress
   - ❌ Multiple 500s = persistent issue

### Set Up Alerts (Optional)

Create a Supabase function to alert on stuck purchases:

```sql
-- Check for purchases stuck in pending > 1 hour
SELECT COUNT(*) 
FROM credit_purchase
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';
  
-- If count > 0, send alert
```

## Rollback Plan

If you need to rollback:

### Rollback Database Function

```sql
-- Restore original function from credit-purchase-system.sql
-- (Run lines 60-101 from that file)
```

### Rollback Webhook

```bash
# Revert the file
git checkout HEAD -- supabase/functions/stripeWebhook/index.ts

# Redeploy
npx supabase functions deploy stripeWebhook
```

## Common Issues

### Issue: "Purchase not found or already processed"

**Cause**: The purchase record doesn't exist or has already been completed.

**Solution**: This is normal for duplicate webhook calls. The new version handles this gracefully.

### Issue: "RPC returned false"

**Cause**: The function executed but returned FALSE (usually due to an exception).

**Solution**: Check the Supabase logs for the actual error (RAISE WARNING messages).

### Issue: Credits still not syncing

**Possible causes**:

1. **RLS policies blocking**: The function uses SECURITY DEFINER, but check policies on `user_credits` table
2. **Foreign key constraint**: Ensure user exists in `auth.users`
3. **Webhook not configured**: Verify webhook is set up in Stripe with correct URL and secret

**Debug steps**:

```sql
-- Check if function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'complete_credit_purchase';

-- Check if user_credits table is accessible
SELECT * FROM user_credits WHERE user_id = 'your-user-id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_credits';

-- Test function directly
SELECT complete_credit_purchase('your-stripe-session-id');
```

## Additional Resources

- Stripe Webhook Documentation: https://stripe.com/docs/webhooks
- Stripe Retry Logic: https://stripe.com/docs/webhooks/best-practices#retry-logic
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

## Questions?

If credits still aren't syncing after these changes:

1. Run `debug-credit-sync-issue.sql` and share the results
2. Check Stripe webhook logs for error messages
3. Check Supabase function logs for detailed errors
4. Verify the webhook secret is correctly set in Supabase environment variables
