-- QUICK CHECK: Run this first to see what's wrong

-- 1. Check if function is updated
SELECT 
    '1. DATABASE FUNCTION' as check_item,
    CASE 
        WHEN prosrc LIKE '%retry_count%' THEN '✅ NEW VERSION (with retry)'
        ELSE '❌ OLD VERSION (needs update) ⚠️ RUN fix-credit-sync-issue.sql'
    END as status
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';

-- 2. Most recent purchase status
SELECT 
    '2. MOST RECENT PURCHASE' as check_item,
    status || ' - ' || credits::text || ' credits - ' || 
    EXTRACT(EPOCH FROM (NOW() - created_at))::integer::text || ' seconds ago' as status
FROM credit_purchase
ORDER BY created_at DESC
LIMIT 1;

-- 3. Your current credits
SELECT 
    '3. YOUR CURRENT CREDITS' as check_item,
    COALESCE(credits, 0)::text || ' credits' as status
FROM user_credits 
WHERE user_id = (SELECT user_id FROM credit_purchase ORDER BY created_at DESC LIMIT 1);

-- 4. Any failed purchases?
SELECT 
    '4. FAILED PURCHASES' as check_item,
    COUNT(*)::text || ' failed purchases' as status
FROM credit_purchase 
WHERE status = 'failed';

-- 5. Show the actual purchase details
SELECT 
    id,
    status,
    credits,
    stripe_session_id,
    metadata,
    created_at,
    updated_at
FROM credit_purchase
ORDER BY created_at DESC
LIMIT 3;
