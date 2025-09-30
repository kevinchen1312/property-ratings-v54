-- Check Pending Payouts for Current User
-- Run this in Supabase SQL Editor to see what payouts exist

-- Show your user ID
SELECT 'Your user ID:' as info, id FROM auth.users LIMIT 1;

-- Show all pending payouts for your user
SELECT 
  'Pending payouts for your user:' as info,
  id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status,
  created_at
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending'
ORDER BY created_at DESC;

-- Show total pending amount
SELECT 
  'Total pending amount:' as info,
  COUNT(*) as payout_count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Show Stripe Connect account status
SELECT 
  'Stripe Connect status:' as info,
  account_status,
  payouts_enabled,
  stripe_account_id
FROM user_stripe_accounts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
