-- Check current state after clearing fake account
-- See what's in the database now

-- Check if user has any Stripe account
SELECT 
  'Stripe account check:' as info,
  COUNT(*) as count,
  string_agg(stripe_account_id, ', ') as account_ids
FROM user_stripe_accounts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Check pending payouts
SELECT 
  'Pending payouts check:' as info,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Check all payouts (any status)
SELECT 
  'All payouts check:' as info,
  status,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY status
ORDER BY status;
