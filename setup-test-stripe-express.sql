-- Setup Test Stripe Express Account
-- Run this to create a test Stripe account for yourself

-- First, let's see your current Stripe account
SELECT 
  user_id,
  stripe_account_id,
  account_status,
  created_at
FROM user_stripe_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- If you need to create a test account, use this format:
-- For test mode, we'll use a demo account ID that the processPayouts function recognizes
INSERT INTO user_stripe_accounts (
  user_id,
  stripe_account_id,
  account_status,
  onboarding_completed
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'acct_test_demo_' || substr(md5(random()::text), 1, 16),
  'active',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  account_status = 'active',
  onboarding_completed = true;

-- Verify the update
SELECT 
  user_id,
  stripe_account_id,
  account_status,
  onboarding_completed
FROM user_stripe_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

