-- Verify Payouts Exist and Are Accessible
-- Run this to make sure the data is there and the function can see it

-- Check if we have pending payouts
SELECT 
  'Pending payouts check:' as test,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount,
  array_agg(status) as statuses
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Check if the specific query the function uses would work
SELECT 
  'Function query simulation:' as test,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts 
WHERE status = 'pending' 
  AND payout_amount > 0
  AND user_id = (SELECT id FROM auth.users LIMIT 1);

-- Show the actual pending payouts
SELECT 
  'Actual pending payouts:' as test,
  id,
  user_id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts 
WHERE status = 'pending' 
  AND payout_amount > 0
  AND user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC;
