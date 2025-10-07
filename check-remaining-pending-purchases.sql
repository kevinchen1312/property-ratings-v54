-- Check Remaining Pending Purchases After Webhook Fix
-- The webhook is now working (showing HTTP 200), let's see what still needs fixing

-- 1. Count pending purchases
SELECT 
    '===== PENDING PURCHASES STATUS =====' as section;

SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO PENDING PURCHASES - All fixed!'
        WHEN COUNT(*) > 0 THEN '⚠️ ' || COUNT(*) || ' purchases still need manual completion'
    END as status,
    COUNT(*) as pending_count,
    SUM(credits) as total_credits_owed,
    SUM(amount) as total_dollars_paid
FROM credit_purchase
WHERE status = 'pending';

-- 2. Show details of any remaining pending purchases
SELECT 
    '===== DETAILS OF PENDING PURCHASES =====' as section;

SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) as "#",
    id,
    email,
    credits,
    amount as dollars_paid,
    stripe_session_id,
    created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as minutes_ago
FROM credit_purchase
WHERE status = 'pending'
ORDER BY created_at;

-- 3. Check your current credit balance
SELECT 
    '===== YOUR CURRENT CREDITS =====' as section;

SELECT 
    user_id,
    credits as current_balance,
    updated_at as last_updated
FROM user_credits
ORDER BY updated_at DESC
LIMIT 5;

-- 4. Show recent completed purchases (to see which ones worked)
SELECT 
    '===== RECENTLY COMPLETED PURCHASES =====' as section;

SELECT 
    id,
    email,
    credits,
    status,
    stripe_session_id,
    created_at
FROM credit_purchase
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. Summary
SELECT 
    '===== SUMMARY =====' as section;

SELECT 
    status,
    COUNT(*) as count,
    SUM(credits) as total_credits,
    SUM(amount) as total_amount
FROM credit_purchase
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY status;
