-- Create Test Earnings for Stripe Connect Testing
-- This script creates fake earnings for a test user so you can test the payout flow
--
-- Usage:
-- 1. Replace 'YOUR_TEST_EMAIL@example.com' with your test user's email
-- 2. Run this in Supabase SQL Editor
-- 3. The user will see $5.00 in pending earnings
-- 4. Test the payout flow in the app

-- Configuration: Replace with your test user's email
\set test_email 'YOUR_TEST_EMAIL@example.com'

-- Get test user ID
DO $$
DECLARE
  v_user_id UUID;
  v_property_id UUID;
  v_purchase_id UUID;
  v_revenue_dist_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = :'test_email';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', :'test_email';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Get or create a test property
  SELECT id INTO v_property_id 
  FROM property 
  LIMIT 1;

  IF v_property_id IS NULL THEN
    -- Create a test property if none exists
    INSERT INTO property (name, address, lat, lng)
    VALUES ('Test Property for Stripe Connect', '123 Test St, Test City, CA', 37.7749, -122.4194)
    RETURNING id INTO v_property_id;
    
    RAISE NOTICE 'Created test property: %', v_property_id;
  ELSE
    RAISE NOTICE 'Using existing property: %', v_property_id;
  END IF;

  -- Get or create a test purchase
  SELECT id INTO v_purchase_id 
  FROM purchase 
  WHERE email = :'test_email'
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    -- Create a test purchase
    INSERT INTO purchase (
      email,
      customer_name,
      total_amount,
      currency,
      status
    ) VALUES (
      :'test_email',
      'Test User',
      10.00,
      'usd',
      'completed'
    ) RETURNING id INTO v_purchase_id;
    
    RAISE NOTICE 'Created test purchase: %', v_purchase_id;
  ELSE
    RAISE NOTICE 'Using existing purchase: %', v_purchase_id;
  END IF;

  -- Create revenue distribution
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
    v_purchase_id,
    v_property_id,
    10.00,
    7.00,  -- 70% to platform
    1.50,  -- 15% to top contributor
    1.50,  -- 15% to other contributors
    v_user_id,
    10
  ) RETURNING id INTO v_revenue_dist_id;

  RAISE NOTICE 'Created revenue distribution: %', v_revenue_dist_id;

  -- Create payout for top contributor
  INSERT INTO contributor_payouts (
    revenue_distribution_id,
    user_id,
    payout_amount,
    rating_count,
    is_top_contributor,
    status
  ) VALUES (
    v_revenue_dist_id,
    v_user_id,
    1.50,
    10,
    true,
    'pending'
  );

  RAISE NOTICE '✅ Created $1.50 pending payout for top contributor';

  -- Create additional revenue distribution for more earnings
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
    v_purchase_id,
    v_property_id,
    20.00,
    14.00,
    3.00,
    3.00,
    v_user_id,
    15
  ) RETURNING id INTO v_revenue_dist_id;

  -- Create second payout
  INSERT INTO contributor_payouts (
    revenue_distribution_id,
    user_id,
    payout_amount,
    rating_count,
    is_top_contributor,
    status
  ) VALUES (
    v_revenue_dist_id,
    v_user_id,
    3.50,
    15,
    true,
    'pending'
  );

  RAISE NOTICE '✅ Created $3.50 pending payout for top contributor';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Test earnings created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total pending earnings: $5.00';
  RAISE NOTICE 'User: %', :'test_email';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Open the app and go to Earnings screen';
  RAISE NOTICE '2. You should see $5.00 in pending earnings';
  RAISE NOTICE '3. Click "Stripe Connection" to set up bank account';
  RAISE NOTICE '4. Complete Stripe onboarding';
  RAISE NOTICE '5. Click "Request Payout" to transfer the money';

END $$;

-- Verify the earnings were created
SELECT 
  cp.id,
  cp.payout_amount,
  cp.rating_count,
  cp.is_top_contributor,
  cp.status,
  cp.created_at
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE u.email = :'test_email'
ORDER BY cp.created_at DESC;
