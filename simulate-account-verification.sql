-- Simulate Stripe Connect Account Verification
-- Run this in Supabase SQL Editor to mark your account as verified

-- Update your test Stripe account to "verified" status
UPDATE user_stripe_accounts 
SET 
  account_status = 'active',
  details_submitted = true,
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Show the updated account status
SELECT 
  'Account verification simulated!' as message,
  account_status,
  payouts_enabled,
  stripe_account_id
FROM user_stripe_accounts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

SELECT 'Now refresh your Earnings screen to see the payout button!' as next_step;
