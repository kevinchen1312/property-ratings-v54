-- Clean Up Demo Stripe Accounts
-- Run this script to remove demo accounts and prepare for live mode
-- ⚠️ IMPORTANT: Run this AFTER updating to live Stripe keys

-- 1. Show current demo accounts
SELECT 
  'Current demo accounts:' as info,
  usa.user_id,
  usa.stripe_account_id,
  usa.account_status,
  u.email
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
WHERE usa.stripe_account_id LIKE 'acct_demo_%';

-- 2. Delete demo Stripe accounts
-- This will allow users to connect real accounts
DELETE FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_demo_%';

-- 3. Verify deletion
SELECT 
  'Remaining demo accounts (should be 0):' as info,
  COUNT(*) as count
FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_demo_%';

-- 4. Show all current Stripe accounts
SELECT 
  'All current Stripe accounts:' as info,
  usa.user_id,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  u.email
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
ORDER BY usa.created_at DESC;

-- ✅ Done! 
-- Demo accounts have been removed.
-- Users can now connect real Stripe accounts.
