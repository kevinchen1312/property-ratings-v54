-- Debug credit sync issues
-- This script helps diagnose why credits aren't syncing

-- 1. Check all recent credit purchases
SELECT 
    cp.id,
    cp.user_id,
    cp.email,
    cp.credits,
    cp.amount,
    cp.status,
    cp.stripe_session_id,
    cp.metadata,
    cp.created_at,
    cp.updated_at,
    -- Check if credits were actually added
    uc.credits as current_user_credits
FROM credit_purchase cp
LEFT JOIN user_credits uc ON uc.user_id = cp.user_id
ORDER BY cp.created_at DESC 
LIMIT 20;

-- 2. Find failed purchases
SELECT 
    'FAILED PURCHASES' as category,
    COUNT(*) as count,
    SUM(credits) as total_credits_not_added,
    SUM(amount) as total_amount
FROM credit_purchase
WHERE status = 'failed';

-- 3. Show details of failed purchases
SELECT 
    id,
    user_id,
    email,
    credits,
    amount,
    status,
    stripe_session_id,
    metadata,
    created_at,
    updated_at
FROM credit_purchase
WHERE status = 'failed'
ORDER BY created_at DESC;

-- 4. Find pending purchases older than 10 minutes (probably stuck)
SELECT 
    'STUCK PENDING PURCHASES' as category,
    id,
    user_id,
    email,
    credits,
    status,
    stripe_session_id,
    created_at,
    NOW() - created_at as age
FROM credit_purchase
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 5. Compare credit_purchase with user_credits to find discrepancies
SELECT 
    'DISCREPANCY CHECK' as category,
    cp.user_id,
    cp.email,
    SUM(CASE WHEN cp.status = 'completed' THEN cp.credits ELSE 0 END) as completed_credits,
    COALESCE(uc.credits, 0) as actual_credits,
    SUM(CASE WHEN cp.status = 'completed' THEN cp.credits ELSE 0 END) - COALESCE(uc.credits, 0) as difference
FROM credit_purchase cp
LEFT JOIN user_credits uc ON uc.user_id = cp.user_id
WHERE cp.created_at > NOW() - INTERVAL '7 days'
GROUP BY cp.user_id, cp.email, uc.credits
HAVING SUM(CASE WHEN cp.status = 'completed' THEN cp.credits ELSE 0 END) - COALESCE(uc.credits, 0) != 0;

-- 6. Check webhook logs (if you have a webhook_log table)
-- Uncomment if you have webhook logging set up
-- SELECT * FROM webhook_log 
-- WHERE event_type = 'checkout.session.completed'
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- 7. Check for duplicate stripe_session_id entries (should be unique)
SELECT 
    stripe_session_id,
    COUNT(*) as count,
    array_agg(status) as statuses
FROM credit_purchase
WHERE stripe_session_id IS NOT NULL
GROUP BY stripe_session_id
HAVING COUNT(*) > 1;

-- 8. Show retry counts from metadata
SELECT 
    id,
    user_id,
    email,
    credits,
    status,
    metadata->>'retry_count' as retry_count,
    metadata->>'last_error' as last_error,
    metadata->>'error' as final_error,
    created_at,
    updated_at
FROM credit_purchase
WHERE metadata IS NOT NULL 
  AND (metadata->>'retry_count' IS NOT NULL OR metadata->>'error' IS NOT NULL)
ORDER BY created_at DESC;
