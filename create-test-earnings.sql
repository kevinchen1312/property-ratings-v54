-- Create Test Earnings Data
-- Run this in Supabase SQL Editor to create some test earnings for your user

-- First, let's see what user ID you have
SELECT 'Your user ID is: ' || id as info FROM auth.users LIMIT 1;

-- Create a test revenue distribution (simulating a property report purchase)
INSERT INTO revenue_distribution (
  purchase_id, 
  property_id, 
  total_revenue, 
  platform_share, 
  top_contributor_share, 
  other_contributors_share,
  top_contributor_id
) VALUES (
  gen_random_uuid(), -- fake purchase_id
  (SELECT id FROM property LIMIT 1), -- use any property
  10.00, -- $10 report purchase
  8.00,  -- 80% platform share
  1.00,  -- 10% top contributor
  1.00,  -- 10% other contributors
  (SELECT id FROM auth.users LIMIT 1) -- your user as top contributor
) RETURNING id, total_revenue;

-- Create test contributor payouts for your user
INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES 
-- Top contributor payout ($1.00)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  1.00,
  5,
  true,
  'pending'
),
-- Regular contributor payout ($0.50)
(
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  0.50,
  2,
  false,
  'pending'
);

-- Show the test data created
SELECT 
  'Test earnings created!' as message,
  COUNT(*) as pending_payouts,
  SUM(payout_amount) as total_earnings
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
  AND status = 'pending';

SELECT 'Now check your Earnings screen in the app!' as next_step;
