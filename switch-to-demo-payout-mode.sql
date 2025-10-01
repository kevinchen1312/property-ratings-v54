-- Switch to Demo Payout Mode
-- This allows you to test payouts without real Stripe transfers

-- Update your Stripe account to use demo mode
-- Replace 'your-email@example.com' with your actual email
UPDATE user_stripe_accounts
SET 
  stripe_account_id = 'acct_demo_' || substr(md5(random()::text), 1, 20),
  account_status = 'active'
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'kevinchen1312@gmail.com'
);

-- Reset any failed payouts to pending so you can try again
UPDATE contributor_payouts
SET status = 'pending', stripe_transfer_id = NULL
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
)
AND status = 'failed';

-- Verify everything is set up
SELECT 
  'Stripe Account' as type,
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.created_at::text as additional_info
FROM user_stripe_accounts usa
JOIN auth.users u ON u.id = usa.user_id
WHERE u.email = 'your-email@example.com'

UNION ALL

SELECT 
  'Pending Payouts' as type,
  u.email,
  COUNT(*)::text as stripe_account_id,
  COALESCE(SUM(payout_amount), 0)::text as account_status,
  'Total pending' as additional_info
FROM contributor_payouts cp
JOIN auth.users u ON u.id = cp.user_id
WHERE u.email = 'your-email@example.com'
AND cp.status = 'pending'
GROUP BY u.email;

