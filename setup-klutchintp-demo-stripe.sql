-- Setup Demo Stripe Account for klutchintp@gmail.com
-- This will allow them to receive test payouts immediately

-- Create or update Stripe account to demo mode
INSERT INTO user_stripe_accounts (
  user_id,
  stripe_account_id,
  account_status,
  payouts_enabled
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'klutchintp@gmail.com'),
  'acct_demo_' || substr(md5(random()::text), 1, 20),
  'active',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  account_status = 'active',
  payouts_enabled = true;

-- Verify the setup
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.created_at
FROM user_stripe_accounts usa
JOIN auth.users u ON u.id = usa.user_id
WHERE u.email = 'klutchintp@gmail.com';

-- Also show their pending payouts
SELECT 
  'Pending Payouts:' as info,
  COUNT(*) as count,
  COALESCE(SUM(payout_amount), 0) as total_amount
FROM contributor_payouts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'klutchintp@gmail.com')
AND status = 'pending';

