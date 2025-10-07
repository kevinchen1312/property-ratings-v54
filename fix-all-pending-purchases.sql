-- Fix All Pending Purchases
-- Run this after the webhook is fixed to credit all failed purchases

-- STEP 1: Check current state
SELECT '===== CURRENT STATE =====' as section;

SELECT 
    'Pending purchases:' as info,
    COUNT(*) as count,
    SUM(credits) as total_credits_owed,
    SUM(amount) as total_amount_paid
FROM credit_purchase
WHERE status = 'pending';

-- STEP 2: Show details of each pending purchase
SELECT '===== PENDING PURCHASE DETAILS =====' as section;

SELECT 
    id,
    email,
    credits,
    amount,
    stripe_session_id,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM credit_purchase
WHERE status = 'pending'
ORDER BY created_at DESC;

-- STEP 3: Check your current credits
SELECT '===== YOUR CURRENT CREDITS =====' as section;

SELECT 
    user_id,
    credits,
    updated_at
FROM user_credits
WHERE user_id IN (
    SELECT user_id FROM credit_purchase WHERE status = 'pending' LIMIT 1
);

-- STEP 4: Complete all pending purchases
-- Copy and run this block separately after checking above:
/*
DO $$
DECLARE
  pending_rec RECORD;
  result_val BOOLEAN;
  success_count INTEGER := 0;
  fail_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===== STARTING PURCHASE COMPLETION =====';
  RAISE NOTICE '';
  
  FOR pending_rec IN 
    SELECT 
        id,
        stripe_session_id, 
        credits, 
        email,
        user_id
    FROM credit_purchase 
    WHERE status = 'pending'
    ORDER BY created_at
  LOOP
    BEGIN
      RAISE NOTICE 'Processing purchase #%: % credits for %', 
        pending_rec.id, pending_rec.credits, pending_rec.email;
      
      SELECT complete_credit_purchase(pending_rec.stripe_session_id) INTO result_val;
      
      IF result_val THEN
        success_count := success_count + 1;
        RAISE NOTICE '  ✅ SUCCESS: Added % credits to user %', 
          pending_rec.credits, 
          SUBSTRING(pending_rec.user_id::TEXT, 1, 8);
      ELSE
        fail_count := fail_count + 1;
        RAISE WARNING '  ❌ FAILED: Could not add credits for session %', 
          pending_rec.stripe_session_id;
      END IF;
      
      RAISE NOTICE '';
      
    EXCEPTION
      WHEN OTHERS THEN
        fail_count := fail_count + 1;
        RAISE WARNING '  ❌ ERROR: % - Session: %', 
          SQLERRM, pending_rec.stripe_session_id;
        RAISE NOTICE '';
    END;
  END LOOP;
  
  RAISE NOTICE '===== COMPLETION SUMMARY =====';
  RAISE NOTICE 'Successful: %', success_count;
  RAISE NOTICE 'Failed: %', fail_count;
  RAISE NOTICE '';
END $$;
*/

-- STEP 5: Verify the fix worked
-- Run this after Step 4:
/*
SELECT '===== VERIFICATION =====' as section;

-- Should be 0 or much fewer than before
SELECT 
    'Remaining pending:' as info,
    COUNT(*) as count
FROM credit_purchase
WHERE status = 'pending';

-- Should be higher than before
SELECT 
    'Completed purchases:' as info,
    COUNT(*) as count
FROM credit_purchase
WHERE status = 'completed';

-- Your new credit balance
SELECT 
    'Your credits now:' as info,
    credits
FROM user_credits
WHERE user_id = auth.uid();
*/

-- NOTES:
-- 1. Run STEP 1-3 first to see what needs fixing
-- 2. Then uncomment and run STEP 4 to fix all purchases
-- 3. Then uncomment and run STEP 5 to verify
-- 4. If any purchases still fail, check the error messages
