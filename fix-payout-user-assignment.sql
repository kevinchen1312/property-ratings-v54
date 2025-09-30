-- Fix: Reassign the test payouts to the correct user (the one the app is using)
-- This will move the $18.05 payouts to kevinchen1312@gmail.com

-- First, let's see what we're about to change
SELECT 
  'BEFORE - Current payout assignments:' as debug,
  user_id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts 
WHERE payout_amount IN (10.00, 8.05)
ORDER BY created_at DESC;

-- Update the payouts to the correct user (the one the app uses)
UPDATE contributor_payouts 
SET user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
WHERE payout_amount IN (10.00, 8.05)
  AND status = 'pending';

-- Verify the change
SELECT 
  'AFTER - Updated payout assignments:' as debug,
  user_id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts 
WHERE payout_amount IN (10.00, 8.05)
ORDER BY created_at DESC;

-- Verify the user now has pending payouts
SELECT 
  'Final verification - User pending payouts:' as debug,
  COUNT(*) as pending_count,
  SUM(payout_amount) as total_pending
FROM contributor_payouts
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND status = 'pending';
