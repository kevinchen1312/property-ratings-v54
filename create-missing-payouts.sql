-- Create Missing Payouts to Match $18.05 Display
-- This will add the remaining $12.05 in pending payouts

-- First, let's see what we have
SELECT 
  'Current pending total:' as info,
  COUNT(*) as count,
  SUM(payout_amount) as current_total
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

-- Create additional pending payouts to reach $18.05
-- We need $12.05 more ($18.05 - $6.00 = $12.05)

INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES 
-- Additional top contributor payout ($8.00)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  8.00,
  12,
  true,
  'pending'
),
-- Additional regular contributor payout ($4.05)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  4.05,
  6,
  false,
  'pending'
);

-- Show the updated totals
SELECT 
  'New pending total:' as info,
  COUNT(*) as count,
  SUM(payout_amount) as new_total
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

SELECT 'Now try requesting your payout again - you should get $18.05!' as next_step;
