-- Clear fake Stripe Connect account to test real integration
-- Run this to remove the test account so we can create a real one

DELETE FROM user_stripe_accounts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

SELECT 'Fake Stripe account cleared - ready to test real integration!' as result;
