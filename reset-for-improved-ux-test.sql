-- Reset the demo account to test the improved UX with both buttons
-- This will show the "Connect to Stripe First" message when tapping Request Payout

-- Reset demo account to not connected state
UPDATE user_stripe_accounts 
SET 
  account_status = 'none',
  details_submitted = false,
  payouts_enabled = false
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND stripe_account_id LIKE 'acct_demo_%';

-- Or completely remove it to test first-time user experience
DELETE FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND stripe_account_id LIKE 'acct_demo_%';

-- Verify clean state
SELECT 
  'Clean State for UX Test:' as debug,
  COUNT(*) as stripe_accounts,
  'Should be 0 for first-time user experience' as expected
FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
