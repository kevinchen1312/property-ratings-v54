-- Debug what the app should be seeing
-- Run this to see exactly what data the app functions should return

-- Get the user ID that the app would use
SELECT 'User ID the app sees:' as debug, id FROM auth.users LIMIT 1;

-- Test the exact query getUserPendingPayouts uses
SELECT 
  'getUserPendingPayouts query result:' as debug,
  COUNT(*) as count,
  SUM(payout_amount) as total,
  array_agg(payout_amount) as amounts
FROM contributor_payouts
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Test the exact query getStripeConnectStatus uses  
SELECT 
  'getStripeConnectStatus query result:' as debug,
  (usa.stripe_account_id IS NOT NULL) as has_account,
  COALESCE(usa.account_status, 'none') as account_status,
  COALESCE(usa.payouts_enabled, FALSE) as payouts_enabled,
  usa.stripe_account_id
FROM auth.users u
LEFT JOIN user_stripe_accounts usa ON u.id = usa.user_id
WHERE u.id = (SELECT id FROM auth.users LIMIT 1);

-- Check if there are any RLS issues
SELECT 
  'RLS test - can we see payouts?' as debug,
  COUNT(*) as visible_payouts
FROM contributor_payouts;
