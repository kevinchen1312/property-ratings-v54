-- STEP 1: Check if database function is updated
SELECT 
    CASE 
        WHEN prosrc LIKE '%retry_count%' THEN '✅ DATABASE FUNCTION IS UPDATED'
        ELSE '❌ DATABASE FUNCTION NEEDS UPDATE - RUN fix-credit-sync-issue.sql FIRST!'
    END as function_status
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';

-- STEP 2: Check your current credits
SELECT 
    'Your Current Credits:' as info,
    COALESCE(credits, 0) as credits
FROM user_credits 
WHERE user_id = (SELECT user_id FROM credit_purchase WHERE status = 'pending' LIMIT 1);

-- STEP 3: Show all pending purchases with details
SELECT 
    '===== PENDING PURCHASES (NOT YET CREDITED) =====' as section;

SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) as "#",
    id,
    email,
    credits,
    stripe_session_id,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM credit_purchase
WHERE status = 'pending'
ORDER BY created_at;

-- STEP 4: Calculate how many credits you're missing
SELECT 
    '===== MISSING CREDITS SUMMARY =====' as section;
    
SELECT 
    COUNT(*) as pending_purchases,
    SUM(credits) as total_missing_credits,
    SUM(amount) as total_amount_paid
FROM credit_purchase
WHERE status = 'pending';

-- STEP 5: MANUAL FIX - Complete all pending purchases at once
-- Copy and paste this after running the checks above:
/*
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
      ELSE
        RAISE WARNING '❌ FAILED: Could not add credits for session %', pending_rec.stripe_session_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR: % - %', SQLERRM, pending_rec.stripe_session_id;
    END;
  END LOOP;
  
  RAISE NOTICE '===== PROCESSING COMPLETE =====';
END $$;
*/
