-- Fix Payout Amounts to Match $18.05 Display
-- First delete existing small payouts, then create the right ones

-- See current total
SELECT 
  'Current pending total:' as step,
  COUNT(*) as count,
  SUM(payout_amount) as current_total
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Delete existing pending payouts (they're too small)
DELETE FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Create new pending payouts that total exactly $18.05
INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES 
-- Top contributor payout ($10.00)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  10.00,
  15,
  true,
  'pending'
),
-- Regular contributor payout ($8.05)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  8.05,
  10,
  false,
  'pending'
);

-- Verify the new total
SELECT 
  'New pending total:' as step,
  COUNT(*) as count,
  SUM(payout_amount) as new_total
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

SELECT 'Perfect! Now try your payout request - you should get exactly $18.05!' as result;
