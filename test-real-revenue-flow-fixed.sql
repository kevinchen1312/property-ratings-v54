-- ================================================
-- TEST REAL REVENUE SHARING FLOW (FIXED)
-- Simulate a purchase by Klutch and earnings for Kevin
-- ================================================

-- Step 1: Get user IDs and create purchase
DO $$
DECLARE
    kevin_user_id UUID;
    klutch_user_id UUID;
    property_id UUID := 'bd9272e6-c1d4-4c53-8846-20e9a41b2013';
    new_purchase_id UUID;
    new_purchase_item_id UUID;
    new_revenue_dist_id UUID;
BEGIN
    -- Get Kevin's user ID (auth.users)
    SELECT au.id INTO kevin_user_id 
    FROM auth.users au
    JOIN app_user u ON au.id = u.id
    WHERE u.email = 'kevinchen1312@gmail.com';
    
    -- Get Klutch's user ID (auth.users)
    SELECT au.id INTO klutch_user_id 
    FROM auth.users au
    JOIN app_user u ON au.id = u.id
    WHERE u.email = 'klutchintp@gmail.com';
    
    RAISE NOTICE 'Kevin ID: %', kevin_user_id;
    RAISE NOTICE 'Klutch ID: %', klutch_user_id;
    
    -- Step 2: Create a purchase by Klutch
    INSERT INTO purchase (email, customer_name, total_amount, status)
    VALUES ('klutchintp@gmail.com', 'Klutch', 15.00, 'completed')
    RETURNING id INTO new_purchase_id;
    
    RAISE NOTICE 'Created purchase: %', new_purchase_id;
    
    -- Step 3: Create purchase item for the property
    INSERT INTO purchase_item (purchase_id, property_id, unit_price, quantity)
    VALUES (new_purchase_id, property_id, 15.00, 1)
    RETURNING id INTO new_purchase_item_id;
    
    RAISE NOTICE 'Created purchase item: %', new_purchase_item_id;
    
    -- Step 4: Create revenue distribution (Kevin as top contributor)
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
        new_purchase_id,
        property_id,
        15.00,          -- total revenue
        12.00,          -- 80% to platform
        1.50,           -- 10% to top contributor = $1.50
        1.50,           -- 10% to other contributors
        kevin_user_id,  -- Kevin is the top contributor!
        16              -- Kevin's rating count
    )
    RETURNING id INTO new_revenue_dist_id;
    
    RAISE NOTICE 'Created revenue distribution: %', new_revenue_dist_id;
    
    -- Step 5: Create payout for Kevin (top contributor)
    INSERT INTO contributor_payouts (
        user_id,
        revenue_distribution_id,
        payout_amount,
        rating_count,
        is_top_contributor,
        status
    ) VALUES (
        kevin_user_id,
        new_revenue_dist_id,
        1.50,
        16,
        true,
        'pending'
    );
    
    RAISE NOTICE '✅ Created payout for Kevin: $1.50';
    
END $$;

-- Verify the earnings were created
SELECT 
    '✅ Kevin earnings' as status,
    u.email,
    SUM(cp.payout_amount) as total_pending_earnings,
    COUNT(*) as num_payouts
FROM contributor_payouts cp
JOIN auth.users au ON cp.user_id = au.id
JOIN app_user u ON au.id = u.id
WHERE u.email = 'kevinchen1312@gmail.com'
  AND cp.status = 'pending'
GROUP BY u.email;
