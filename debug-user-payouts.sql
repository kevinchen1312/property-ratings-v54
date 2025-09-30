-- Debug User Payouts - Find out why $18.05 isn't being processed
-- Run this in Supabase SQL Editor

-- 1. Check your user ID
SELECT 'Your user ID:' as step, id as user_id FROM auth.users LIMIT 1;

-- 2. Check ALL contributor payouts for your user (any status)
SELECT 
  'All your payouts:' as step,
  id,
  payout_amount,
  status,
  created_at,
  is_top_contributor
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC;

-- 3. Check specifically PENDING payouts
SELECT 
  'Pending payouts:' as step,
  id,
  payout_amount,
  status,
  created_at
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending'
ORDER BY created_at DESC;

-- 4. Check your Stripe Connect account
SELECT 
  'Stripe Connect account:' as step,
  stripe_account_id,
  account_status,
  payouts_enabled
FROM user_stripe_accounts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 5. Count total pending amount
SELECT 
  'Total pending amount:' as step,
  COUNT(*) as count,
  SUM(payout_amount) as total_pending
FROM contributor_payouts 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND status = 'pending'
  AND payout_amount > 0;
