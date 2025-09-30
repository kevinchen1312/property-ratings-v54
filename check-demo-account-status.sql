-- Check if the demo account was created and what the app should be seeing
SELECT 
  'Demo Account Status:' as debug,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  usa.details_submitted,
  usa.created_at
FROM auth.users u
LEFT JOIN user_stripe_accounts usa ON u.id = usa.user_id
WHERE u.id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- Check what the getStripeConnectStatus function should return
SELECT 
  'What getStripeConnectStatus should see:' as debug,
  (usa.stripe_account_id IS NOT NULL) as has_account,
  COALESCE(usa.account_status, 'none') as account_status,
  COALESCE(usa.payouts_enabled, FALSE) as payouts_enabled,
  usa.stripe_account_id
FROM auth.users u
LEFT JOIN user_stripe_accounts usa ON u.id = usa.user_id
WHERE u.id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
