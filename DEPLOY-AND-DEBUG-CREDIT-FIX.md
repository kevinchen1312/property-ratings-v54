# Deploy and Debug Credit Sync Fix - Step by Step

## Current Status
Credits are not updating after purchase. The webhook is firing (you can see events in Stripe), but credits aren't being added to your account.

## Step-by-Step Fix

### STEP 1: Check Current State

First, let's see what's happening:

```sql
-- Run this in Supabase SQL Editor:
-- File: investigate-current-issue.sql

-- Copy and paste the entire investigate-current-issue.sql file
```

This will tell us:
- ✅ If the database function was updated
- ✅ What the status of your recent purchase is
- ✅ If there are any errors

### STEP 2: Deploy the Database Fix

**CRITICAL: This MUST be done first**

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `fix-credit-sync-issue.sql`
3. Click "Run"
4. You should see: "CREATE FUNCTION" messages

Verify it worked:
```sql
SELECT 
    CASE 
        WHEN prosrc LIKE '%retry_count%' THEN '✅ NEW VERSION'
        ELSE '❌ OLD VERSION - FIX NOT DEPLOYED'
    END as status
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';
```

### STEP 3: Deploy the Webhook Fix

The webhook function also needs to be updated.

**Option A: Deploy via Supabase CLI** (recommended)
```powershell
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"
npx supabase functions deploy stripeWebhook
```

**Option B: Manual via Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Click on `stripeWebhook`
3. Copy the contents of `supabase/functions/stripeWebhook/index.ts`
4. Paste and deploy

### STEP 4: Verify Webhook Deployment

Check the webhook logs:
1. Make a test purchase
2. Go to Supabase Dashboard → Edge Functions → stripeWebhook → Logs
3. Look for these new emoji logs:
   - 🛒 Processing credit purchase
   - ✅ Successfully added credits
   - OR ❌ Failed (with detailed error)

### STEP 5: Test the Fix

1. **Make a small test purchase** ($5 starter pack)
2. **Immediately check the database**:
   ```sql
   -- Run this RIGHT AFTER purchase
   SELECT 
       status,
       credits,
       stripe_session_id,
       created_at,
       metadata
   FROM credit_purchase
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Check if credits were added**:
   ```sql
   SELECT * FROM user_credits WHERE user_id = auth.uid();
   ```

## Troubleshooting

### Issue 1: Function Not Updated

**Symptom**: Step 2 verification shows "❌ OLD VERSION"

**Solution**: 
```sql
-- Run fix-credit-sync-issue.sql again
-- Make sure you see "CREATE FUNCTION" in the output
```

### Issue 2: Webhook Still Returns 200 on Error

**Symptom**: Stripe shows HTTP 200 but credits not added

**Solution**: Webhook wasn't deployed. Redo Step 3.

### Issue 3: "Purchase not found" Error

**Symptom**: Webhook logs show "Purchase not found"

**Solution**: The stripe_session_id might not be saved to credit_purchase

```sql
-- Check if stripe_session_id is being saved
SELECT id, stripe_session_id, created_at
FROM credit_purchase
ORDER BY created_at DESC
LIMIT 5;

-- If stripe_session_id is NULL, there's an issue in createCreditCheckout
```

### Issue 4: RLS Policy Blocking

**Symptom**: "permission denied" or "insufficient privileges"

**Solution**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_credits';

-- The function uses SECURITY DEFINER so it should bypass RLS
-- But let's verify the user_credits table allows inserts
```

### Issue 5: Credits Still Pending

**Symptom**: Purchase shows status='pending' after several minutes

**Solution**: Either webhook didn't fire OR there's an error

1. **Check Stripe webhook logs**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click on your webhook endpoint
   - Look for recent `checkout.session.completed` events
   - Check HTTP response code

2. **Manually trigger the function**:
   ```sql
   -- Get the session ID
   SELECT stripe_session_id FROM credit_purchase 
   WHERE status='pending' 
   ORDER BY created_at DESC LIMIT 1;
   
   -- Manually complete it
   SELECT complete_credit_purchase('cs_test_...');
   
   -- Check if it worked
   SELECT * FROM user_credits WHERE user_id = auth.uid();
   ```

### Issue 6: Multiple Failed Purchases

**Symptom**: Multiple purchases show status='failed'

**Solution**: Retry them all
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

## Quick Test After Deployment

Run this complete test:

```sql
-- 1. Verify function is updated
SELECT 'Function Version:' as check, 
    CASE 
        WHEN prosrc LIKE '%retry_count%' THEN '✅ NEW VERSION'
        ELSE '❌ OLD VERSION'
    END as result
FROM pg_proc WHERE proname = 'complete_credit_purchase'

UNION ALL

-- 2. Check recent purchases
SELECT 'Recent Purchases:' as check, 
    COUNT(*)::text || ' purchases in last hour' as result
FROM credit_purchase 
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

-- 3. Check failed purchases
SELECT 'Failed Purchases:' as check,
    COUNT(*)::text || ' failed (need retry)' as result
FROM credit_purchase 
WHERE status = 'failed'

UNION ALL

-- 4. Check your credits
SELECT 'Your Credits:' as check,
    COALESCE(credits, 0)::text || ' credits' as result
FROM user_credits 
WHERE user_id = auth.uid();
```

## Expected Results After Fix

### Successful Purchase Flow

1. **Stripe Event**: `checkout.session.completed` fires
2. **Webhook Logs**: Shows 🛒 Processing credit purchase
3. **Database**: `credit_purchase.status` changes from 'pending' to 'completed'
4. **Credits**: `user_credits.credits` increases
5. **Webhook Response**: HTTP 200 with success message
6. **App**: Credits show in UI immediately (after refresh)

### Failed Purchase Flow (with retry)

1. **Stripe Event**: `checkout.session.completed` fires
2. **Webhook Logs**: Shows ❌ Failed with error details
3. **Database**: `credit_purchase.status` stays 'pending', metadata shows retry_count
4. **Webhook Response**: HTTP 500 (tells Stripe to retry)
5. **Stripe Retry**: Tries again in 1 minute, then 5 minutes, then 30 minutes
6. **Eventually**: Succeeds on retry OR fails permanently after 3 attempts

## Monitor for Issues

Run this daily to catch problems:

```sql
-- Find purchases that need attention
SELECT 
    CASE 
        WHEN status = 'pending' AND created_at < NOW() - INTERVAL '1 hour' 
            THEN '⚠️ STUCK PENDING'
        WHEN status = 'failed' 
            THEN '❌ FAILED'
        ELSE '✅ OK'
    END as alert,
    id,
    email,
    credits,
    status,
    created_at,
    metadata->>'last_error' as error
FROM credit_purchase
WHERE created_at > NOW() - INTERVAL '7 days'
    AND status IN ('pending', 'failed')
ORDER BY created_at DESC;
```

## Need Help?

If credits STILL don't sync after following all steps:

1. Run `investigate-current-issue.sql` and share the output
2. Check Supabase function logs (Dashboard → Edge Functions → stripeWebhook → Logs)
3. Check Stripe webhook logs (Dashboard → Developers → Webhooks)
4. Run the test purchase query above and share results
