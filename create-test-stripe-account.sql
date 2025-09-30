-- Create a test Stripe Connect account for the user
-- This will allow the payout function to process the $18.05

-- Insert a test Stripe Connect account for the user
INSERT INTO user_stripe_accounts (
  user_id,
  stripe_account_id,
  account_status,
  payouts_enabled,
  created_at,
  updated_at
) VALUES (
  'd0a25789-37c7-4816-9b5a-0e7f9305da76',
  'acct_test_1234567890',  -- Test Stripe account ID
  'active',
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  account_status = EXCLUDED.account_status,
  payouts_enabled = EXCLUDED.payouts_enabled,
  updated_at = EXCLUDED.updated_at;

-- Verify the account was created
SELECT 
  'Created Stripe Connect Account:' as debug,
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled
FROM auth.users u
INNER JOIN user_stripe_accounts usa ON u.id = usa.user_id
WHERE u.id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- Verify the payout query will now work
SELECT 
  'Payouts Now Eligible for Processing:' as debug,
  COUNT(*) as eligible_payouts,
  SUM(cp.payout_amount) as total_amount
FROM contributor_payouts cp
INNER JOIN user_stripe_accounts usa ON cp.user_id = usa.user_id
WHERE cp.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND cp.status = 'pending'
  AND cp.payout_amount > 0
  AND usa.payouts_enabled = true
  AND usa.account_status = 'active';
