-- Debug the actual Stripe Connect status for the user
-- This will show why the payout function isn't finding any eligible payouts

SELECT 
  'User Stripe Connect Status:' as debug,
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  usa.created_at as account_created
FROM auth.users u
LEFT JOIN user_stripe_accounts usa ON u.id = usa.user_id
WHERE u.id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- Check what the payout query would actually find
SELECT 
  'Payouts Query Result (what processPayouts sees):' as debug,
  cp.id,
  cp.payout_amount,
  cp.status,
  usa.stripe_account_id,
  usa.payouts_enabled,
  usa.account_status
FROM contributor_payouts cp
INNER JOIN user_stripe_accounts usa ON cp.user_id = usa.user_id
WHERE cp.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND cp.status = 'pending'
  AND cp.payout_amount > 0
  AND usa.payouts_enabled = true
  AND usa.account_status = 'active';

-- Show all pending payouts for this user (regardless of Stripe status)
SELECT 
  'All Pending Payouts (regardless of Stripe status):' as debug,
  cp.id,
  cp.payout_amount,
  cp.status
FROM contributor_payouts cp
WHERE cp.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
  AND cp.status = 'pending';
