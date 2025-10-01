-- Verify the payout was successfully processed
SELECT 
  cp.id,
  cp.user_id,
  u.email,
  cp.property_id,
  cp.payout_amount,
  cp.status,
  cp.stripe_transfer_id,
  cp.created_at,
  cp.paid_at
FROM contributor_payouts cp
JOIN auth.users u ON u.id = cp.user_id
WHERE u.email = 'kevinchen1312@gmail.com'
ORDER BY cp.created_at DESC
LIMIT 5;

