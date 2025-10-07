-- Verify Live Mode Setup
-- Run this to check if everything is configured correctly

-- 1. Check for any remaining demo accounts
SELECT 
  '🧪 Demo Accounts (should be 0):' as check_type,
  COUNT(*) as count
FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_demo_%';

-- 2. Check for live Stripe accounts
SELECT 
  '💳 Live Stripe Accounts:' as check_type,
  COUNT(*) as count
FROM user_stripe_accounts 
WHERE stripe_account_id LIKE 'acct_%' 
  AND stripe_account_id NOT LIKE 'acct_demo_%';

-- 3. Show all Stripe accounts with details
SELECT 
  '📋 All Stripe Accounts:' as info,
  u.email,
  usa.stripe_account_id,
  CASE 
    WHEN usa.stripe_account_id LIKE 'acct_demo_%' THEN '🧪 DEMO'
    ELSE '💳 LIVE'
  END as mode,
  usa.account_status,
  usa.payouts_enabled,
  usa.details_submitted,
  usa.created_at
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
ORDER BY usa.created_at DESC;

-- 4. Check recent payouts with transfer IDs
SELECT 
  '💰 Recent Payouts:' as info,
  u.email,
  cp.payout_amount,
  cp.status,
  cp.payout_reference as transfer_id,
  CASE 
    WHEN cp.payout_reference LIKE 'tr_demo_%' THEN '🧪 DEMO'
    WHEN cp.payout_reference LIKE 'tr_%' THEN '💳 LIVE'
    ELSE '❓ NONE'
  END as transfer_mode,
  cp.processed_at
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE cp.status IN ('paid', 'processing', 'completed')
ORDER BY cp.processed_at DESC
LIMIT 10;

-- 5. Summary
SELECT 
  '📊 Summary:' as info,
  (SELECT COUNT(*) FROM user_stripe_accounts WHERE stripe_account_id LIKE 'acct_demo_%') as demo_accounts,
  (SELECT COUNT(*) FROM user_stripe_accounts WHERE stripe_account_id LIKE 'acct_%' AND stripe_account_id NOT LIKE 'acct_demo_%') as live_accounts,
  (SELECT COUNT(*) FROM contributor_payouts WHERE payout_reference LIKE 'tr_demo_%') as demo_transfers,
  (SELECT COUNT(*) FROM contributor_payouts WHERE payout_reference LIKE 'tr_%' AND payout_reference NOT LIKE 'tr_demo_%') as live_transfers;

-- ✅ Interpretation:
-- - demo_accounts should be 0 in production
-- - live_accounts should increase as users connect
-- - demo_transfers = old test payouts (can ignore)
-- - live_transfers = real money transfers 💰
