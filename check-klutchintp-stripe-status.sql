-- Check Stripe Connect status for klutchintp@gmail.com

-- First, check if the user exists
SELECT 
  'User Info' as type,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'klutchintp@gmail.com';

-- Check if there's a Stripe account record
SELECT 
  'Stripe Account' as type,
  usa.user_id,
  usa.stripe_account_id,
  usa.account_status,
  usa.created_at,
  u.email
FROM user_stripe_accounts usa
JOIN auth.users u ON u.id = usa.user_id
WHERE u.email = 'klutchintp@gmail.com';

-- Check pending payouts
SELECT 
  'Pending Payouts' as type,
  cp.id as payout_id,
  cp.payout_amount,
  cp.status,
  cp.created_at,
  u.email
FROM contributor_payouts cp
JOIN auth.users u ON u.id = cp.user_id
WHERE u.email = 'klutchintp@gmail.com'
AND cp.status = 'pending';

