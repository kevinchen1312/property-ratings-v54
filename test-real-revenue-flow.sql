-- ================================================
-- TEST REAL REVENUE SHARING FLOW
-- Simulate a purchase by Klutch and earnings for Kevin
-- ================================================

-- Step 1: Get user IDs
DO $$
DECLARE
    kevin_user_id UUID;
    klutch_user_id UUID;
    property_id UUID := 'bd9272e6-c1d4-4c53-8846-20e9a41b2013';
    new_purchase_id UUID;
    new_purchase_item_id UUID;
BEGIN
    -- Get Kevin's user ID
    SELECT id INTO kevin_user_id FROM app_user WHERE email = 'kevinchen1312@gmail.com';
    
    -- Get Klutch's user ID
    SELECT id INTO klutch_user_id FROM app_user WHERE email = 'klutchintp@gmail.com';
    
    RAISE NOTICE 'Kevin ID: %', kevin_user_id;
    RAISE NOTICE 'Klutch ID: %', klutch_user_id;
    
    -- Step 2: Create a purchase by Klutch
    INSERT INTO purchases (user_id, total_amount, status)
    VALUES (klutch_user_id, 15.00, 'completed')
    RETURNING id INTO new_purchase_id;
    
    RAISE NOTICE 'Created purchase: %', new_purchase_id;
    
    -- Step 3: Create purchase item for the property
    INSERT INTO purchase_items (purchase_id, property_id, amount)
    VALUES (new_purchase_id, property_id, 15.00)
    RETURNING id INTO new_purchase_item_id;
    
    RAISE NOTICE 'Created purchase item: %', new_purchase_item_id;
    
    -- Step 4: Create revenue distribution (Kevin as top contributor)
    INSERT INTO revenue_distributions (
        purchase_item_id,
        property_id,
        top_contributor_id,
        top_contributor_amount,
        other_contributors_amount,
        platform_amount,
        total_amount
    ) VALUES (
        new_purchase_item_id,
        property_id,
        kevin_user_id,  -- Kevin is the top contributor!
        1.50,           -- 10% of $15 = $1.50
        1.50,           -- 10% split among other contributors
        12.00,          -- 80% to platform
        15.00
    );
    
    RAISE NOTICE 'Created revenue distribution';
    
    -- Step 5: Create payout for Kevin (top contributor)
    INSERT INTO contributor_payouts (
        user_id,
        amount,
        revenue_distribution_id,
        payout_type,
        status
    ) VALUES (
        kevin_user_id,
        1.50,
        (SELECT id FROM revenue_distributions WHERE purchase_item_id = new_purchase_item_id),
        'top_contributor',
        'pending'
    );
    
    RAISE NOTICE 'Created payout for Kevin: $1.50';
    
END $$;

-- Verify the earnings were created
SELECT 
    'Kevin earnings' as check_name,
    u.email,
    SUM(cp.amount) as total_pending_earnings,
    COUNT(*) as num_payouts
FROM contributor_payouts cp
JOIN app_user u ON cp.user_id = u.id
WHERE u.email = 'kevinchen1312@gmail.com'
  AND cp.status = 'pending'
GROUP BY u.email;
