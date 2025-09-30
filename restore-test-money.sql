-- Restore the user's test money that was incorrectly marked as "paid"
-- This will revert the fake payouts back to "pending" status

-- First, show what we're about to restore
SELECT 
  'Payouts to Restore:' as debug,
  id,
  payout_amount,
  status,
  stripe_transfer_id,
  processed_at
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'paid'
  AND stripe_transfer_id LIKE 'tr_test_%';

-- Restore the fake payouts back to pending status
UPDATE contributor_payouts 
SET 
  status = 'pending',
  stripe_transfer_id = NULL,
  processed_at = NULL,
  failure_reason = NULL
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'paid'
  AND stripe_transfer_id LIKE 'tr_test_%';

-- Verify the restoration
SELECT 
  'Restored User Balance:' as debug,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payouts,
  SUM(CASE WHEN status = 'pending' THEN payout_amount ELSE 0 END) as available_balance,
  SUM(CASE WHEN status = 'paid' THEN payout_amount ELSE 0 END) as paid_amount
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
