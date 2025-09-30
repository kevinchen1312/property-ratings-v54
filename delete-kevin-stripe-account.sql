-- Delete Kevin's Stripe account to force fresh onboarding
DELETE FROM user_stripe_accounts
WHERE user_id = (
    SELECT id FROM app_user WHERE email = 'kevinchen1312@gmail.com'
);

-- Verify it's deleted
SELECT 
    'Accounts for Kevin:' as check_name, 
    COUNT(*) as count 
FROM user_stripe_accounts
WHERE user_id = (
    SELECT id FROM app_user WHERE email = 'kevinchen1312@gmail.com'
);
