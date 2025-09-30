-- Check what happened to the user's money after the "successful" payout
-- This will show us the current state and what was changed

-- Check current user balance and payout status
SELECT 
  'Current User State:' as debug,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payouts,
  SUM(CASE WHEN status = 'pending' THEN payout_amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN status = 'paid' THEN payout_amount ELSE 0 END) as paid_amount
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- Show the recent payout records that were just processed
SELECT 
  'Recently Processed Payouts:' as debug,
  id,
  payout_amount,
  status,
  stripe_transfer_id,
  processed_at,
  created_at
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND payout_amount IN (10.00, 8.05)
ORDER BY processed_at DESC;

-- Check if the Stripe transfer IDs are fake (test transfers)
SELECT 
  'Stripe Transfer Analysis:' as debug,
  stripe_transfer_id,
  CASE 
    WHEN stripe_transfer_id LIKE 'tr_test_%' THEN 'FAKE_TEST_TRANSFER'
    WHEN stripe_transfer_id LIKE 'tr_%' THEN 'REAL_STRIPE_TRANSFER'
    ELSE 'UNKNOWN'
  END as transfer_type,
  payout_amount,
  status
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'paid'
  AND stripe_transfer_id IS NOT NULL;
