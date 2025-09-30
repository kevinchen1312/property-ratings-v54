-- Clear the test Stripe Connect account so we can test real Stripe Connect
DELETE FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- Verify it's cleared
SELECT 
  'User Stripe Account Status:' as debug,
  COUNT(*) as account_count
FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
