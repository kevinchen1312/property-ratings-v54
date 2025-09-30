-- Recreate test setup for real Stripe Connect testing
-- This will give us fresh data to test with

-- Create new pending payouts (since the old ones might be gone)
INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES 
-- Top contributor payout ($12.00)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  12.00,
  15,
  true,
  'pending'
),
-- Regular contributor payout ($6.05)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  6.05,
  8,
  false,
  'pending'
);

-- Verify the new setup
SELECT 
  'New test setup:' as info,
  COUNT(*) as payout_count,
  SUM(payout_amount) as total_pending
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending';

SELECT 'Ready to test real Stripe Connect with $18.05 in earnings!' as result;
