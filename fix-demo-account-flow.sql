-- Fix the demo account to require the Connect Bank Account flow
-- This preserves the beautiful Stripe connection experience

-- Update the demo account to show as "pending" setup
UPDATE user_stripe_accounts 
SET 
  account_status = 'pending',
  details_submitted = false,
  payouts_enabled = false
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND stripe_account_id LIKE 'acct_demo_%';

-- Verify the fix
SELECT 
  'Fixed Demo Account Status:' as debug,
  stripe_account_id,
  account_status,
  details_submitted,
  payouts_enabled,
  'Should show Connect Bank Account button' as expected_behavior
FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
