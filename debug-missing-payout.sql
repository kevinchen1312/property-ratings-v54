-- Debug: Where did the $1.00 payout go?

-- Check ALL your payouts (any status)
SELECT 
  'ALL YOUR PAYOUTS (any status)' as section;

SELECT 
  cp.id,
  cp.created_at,
  cp.payout_amount,
  cp.status,
  cp.is_top_contributor,
  cp.paid_at,
  cp.payout_reference,
  cp.payout_method,
  p.address as property
FROM contributor_payouts cp
JOIN revenue_distribution rd ON rd.id = cp.revenue_distribution_id
JOIN property p ON p.id = rd.property_id
WHERE cp.user_id = auth.uid()
ORDER BY cp.created_at DESC;

-- Check if status got changed somehow
SELECT 
  'PAYOUT STATUS COUNTS' as section;

SELECT 
  status,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts
WHERE user_id = auth.uid()
GROUP BY status;

-- Check your Stripe account status
SELECT 
  'YOUR STRIPE ACCOUNT STATUS' as section;

SELECT 
  id,
  stripe_account_id,
  payouts_enabled,
  details_submitted,
  charges_enabled,
  created_at
FROM user_stripe_accounts
WHERE user_id = auth.uid();

