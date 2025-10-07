-- Investigate why credits aren't updating after purchase
-- Run this immediately after a purchase attempt

-- 1. Check the most recent credit purchase
SELECT 
    'MOST RECENT PURCHASE' as section,
    id,
    user_id,
    email,
    credits,
    amount,
    status,
    stripe_session_id,
    metadata,
    created_at,
    updated_at,
    updated_at - created_at as processing_time
FROM credit_purchase
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check if user_credits record exists for that user
WITH latest_purchase AS (
    SELECT user_id, credits, status
    FROM credit_purchase
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    'USER CREDITS STATUS' as section,
    lp.user_id,
    lp.credits as purchased_credits,
    lp.status as purchase_status,
    COALESCE(uc.credits, 0) as current_credits,
    uc.created_at as credits_record_created,
    uc.updated_at as credits_last_updated
FROM latest_purchase lp
LEFT JOIN user_credits uc ON uc.user_id = lp.user_id;

-- 3. Check if the complete_credit_purchase function was updated
SELECT 
    'FUNCTION VERSION CHECK' as section,
    CASE 
        WHEN prosrc LIKE '%retry_count%' THEN '✅ NEW VERSION (with retry logic)'
        ELSE '❌ OLD VERSION (needs update)'
    END as function_status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';

-- 4. Check if there are any RLS policies blocking the insert
SELECT 
    'RLS POLICIES ON user_credits' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_credits';

-- 5. Test if we can manually call the function
-- (This will show any errors)
WITH latest_purchase AS (
    SELECT stripe_session_id
    FROM credit_purchase
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    'MANUAL FUNCTION TEST' as section,
    stripe_session_id,
    'Run this command to test:' as instruction,
    'SELECT complete_credit_purchase(''' || stripe_session_id || ''');' as command
FROM latest_purchase;

-- 6. Check all purchases from the last hour
SELECT 
    'ALL RECENT PURCHASES' as section,
    id,
    email,
    credits,
    status,
    stripe_session_id,
    created_at,
    metadata->>'retry_count' as retries,
    metadata->>'last_error' as last_error
FROM credit_purchase
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 7. Check if there's a user_id mismatch
WITH latest_purchase AS (
    SELECT user_id, email
    FROM credit_purchase
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    'USER ID VALIDATION' as section,
    lp.user_id as purchase_user_id,
    lp.email as purchase_email,
    au.id as auth_user_id,
    au.email as auth_email,
    CASE 
        WHEN lp.user_id = au.id THEN '✅ User IDs match'
        ELSE '❌ User ID MISMATCH!'
    END as validation_status
FROM latest_purchase lp
LEFT JOIN auth.users au ON au.email = lp.email;
