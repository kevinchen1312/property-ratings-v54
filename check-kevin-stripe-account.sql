-- Check Kevin's current Stripe account status
SELECT 
    id,
    user_id,
    stripe_account_id,
    account_status,
    payouts_enabled,
    details_submitted,
    created_at
FROM user_stripe_accounts
WHERE user_id = (
    SELECT id FROM app_user WHERE email = 'kevinchen1312@gmail.com'
)
ORDER BY created_at DESC;
