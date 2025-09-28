-- Create test pending payouts for Stripe Connect testing
-- Run this in your Supabase SQL Editor after running the stripe-connect-migration.sql

-- First, let's get your user ID (replace with your actual email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create a test revenue distribution record
INSERT INTO revenue_distribution (
  purchase_id,
  property_id,
  total_revenue,
  platform_share,
  top_contributor_share,
  other_contributors_share,
  top_contributor_id,
  top_contributor_rating_count
) VALUES (
  'test-purchase-' || extract(epoch from now()),
  '364607cd-69fb-4e8a-9b20-4ff4ce6758e7', -- Merriman Road property
  10.00,
  8.00,
  1.00,
  1.00,
  (SELECT id FROM auth.users LIMIT 1), -- Use first user
  5
) RETURNING id;

-- Create test pending payouts (replace the revenue_distribution_id with the one from above)
INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES 
-- First payout: $1.50 (Top Contributor)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  1.50,
  5,
  true,
  'pending'
),
-- Second payout: $2.25 (Regular Contributor)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  2.25,
  3,
  false,
  'pending'
),
-- Third payout: $0.75 (Below $1 minimum - should fail)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  0.75,
  1,
  false,
  'pending'
);

-- Check the results
SELECT 
  cp.id,
  cp.payout_amount,
  cp.is_top_contributor,
  cp.status,
  u.email as user_email
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE cp.status = 'pending'
ORDER BY cp.created_at DESC;

-- Show total pending payouts
SELECT 
  COUNT(*) as pending_count,
  SUM(payout_amount) as total_pending
FROM contributor_payouts 
WHERE status = 'pending';

SELECT '✅ Test payouts created! Go to your Earnings screen to see them.' as result;
