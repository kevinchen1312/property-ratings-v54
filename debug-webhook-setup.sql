-- Debug webhook setup and environment
-- This helps identify why Stripe webhooks aren't processing automatically

-- 1. Check recent credit purchases and their status
SELECT 
    id,
    user_id,
    package_id,
    credits,
    amount,
    status,
    stripe_session_id,
    created_at,
    updated_at,
    CASE 
        WHEN status = 'pending' AND created_at < NOW() - INTERVAL '1 hour' 
        THEN 'STALE_PENDING'
        WHEN status = 'pending' 
        THEN 'RECENT_PENDING'
        ELSE status
    END as status_analysis
FROM credit_purchase 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Count purchases by status
SELECT 
    status,
    COUNT(*) as count,
    SUM(credits) as total_credits,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM credit_purchase 
GROUP BY status;

-- 3. Check if webhook processing function exists and works
SELECT 
    proname as function_name,
    proargtypes,
    CASE 
        WHEN prosrc LIKE '%complete_credit_purchase%' THEN 'FOUND'
        ELSE 'NOT_FOUND'
    END as function_status
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';

-- 4. Test the webhook function with a pending purchase (if any exist)
-- Uncomment and replace with actual stripe_session_id to test
-- SELECT complete_credit_purchase('cs_test_your_session_id_here');

-- 5. Check user credits table
SELECT 
    user_id,
    credits,
    created_at,
    updated_at
FROM user_credits 
ORDER BY updated_at DESC 
LIMIT 10;
