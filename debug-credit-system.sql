-- Debug the credit purchase system
-- Run this to check if everything is set up correctly

-- 1. Check if credit_purchase table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_purchase'
ORDER BY ordinal_position;

-- 2. Check if complete_credit_purchase function exists
SELECT proname, proargtypes, prosrc 
FROM pg_proc 
WHERE proname = 'complete_credit_purchase';

-- 3. Check recent credit purchases
SELECT 
    id,
    user_id,
    email,
    package_id,
    credits,
    amount,
    status,
    stripe_session_id,
    created_at,
    updated_at
FROM credit_purchase 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check user credits for your user
SELECT * FROM user_credits 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- 5. Check if there are any pending credit purchases
SELECT COUNT(*) as pending_purchases
FROM credit_purchase 
WHERE status = 'pending';

-- 6. Test the complete_credit_purchase function (if there are pending purchases)
-- Uncomment the line below and replace with an actual stripe_session_id if needed
-- SELECT complete_credit_purchase('your_stripe_session_id_here');
