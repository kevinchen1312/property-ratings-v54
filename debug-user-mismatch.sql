-- Debug user ID mismatch between app and database
-- This will show us if the payouts are assigned to the wrong user

-- Show all users and their pending payouts
SELECT 
  'All users and their pending payouts:' as debug,
  u.id as user_id,
  u.email,
  COUNT(cp.id) as pending_payouts,
  COALESCE(SUM(cp.payout_amount), 0) as total_pending
FROM auth.users u
LEFT JOIN contributor_payouts cp ON u.id = cp.user_id AND cp.status = 'pending'
GROUP BY u.id, u.email
ORDER BY pending_payouts DESC;

-- Show the specific payouts we created
SELECT 
  'Our test payouts:' as debug,
  user_id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts 
WHERE payout_amount IN (10.00, 8.05)
ORDER BY created_at DESC;

-- Show what user the app should be using (first user)
SELECT 
  'First user (what app uses):' as debug,
  id as user_id,
  email
FROM auth.users 
ORDER BY created_at 
LIMIT 1;
