-- Fix the balance to exactly $18.05 as intended
-- Remove extra payouts and keep only our intended test payouts

-- First, see all current pending payouts
SELECT 
  'All Current Pending Payouts:' as debug,
  id,
  payout_amount,
  status,
  created_at,
  CASE 
    WHEN payout_amount IN (10.00, 8.05) THEN 'OUR_TEST_PAYOUTS'
    ELSE 'EXTRA_PAYOUTS'
  END as payout_type
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'pending'
ORDER BY created_at DESC;

-- Delete all pending payouts except our intended $10.00 and $8.05 test payouts
DELETE FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'pending'
  AND payout_amount NOT IN (10.00, 8.05);

-- Verify we now have exactly $18.05
SELECT 
  'Final Balance Check:' as debug,
  COUNT(*) as pending_payouts,
  SUM(payout_amount) as total_balance,
  array_agg(payout_amount ORDER BY payout_amount DESC) as amounts
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'pending';

-- Show the remaining payouts
SELECT 
  'Remaining Test Payouts:' as debug,
  id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'pending'
ORDER BY payout_amount DESC;
