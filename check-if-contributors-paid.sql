-- Check if Contributors Got Paid for Recent Redemptions

-- ============================================
-- 1. Your Recent Redemptions
-- ============================================
SELECT 
  '=== YOUR RECENT REDEMPTIONS ===' as section,
  '' as details;

SELECT 
  rr.created_at as when_redeemed,
  p.name,
  p.address,
  rr.credits_used,
  rr.revenue_value as should_distribute,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM revenue_distribution rd 
      WHERE rd.redemption_id = rr.id
    ) THEN '✅ Revenue Distribution Created'
    ELSE '❌ NO Revenue Distribution'
  END as distribution_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM revenue_distribution rd 
      JOIN contributor_payouts cp ON cp.revenue_distribution_id = rd.id
      WHERE rd.redemption_id = rr.id
    ) THEN '✅ Contributors Paid'
    ELSE '❌ NO Contributor Payouts'
  END as payout_status
FROM report_redemption rr
JOIN property p ON rr.property_id = p.id
WHERE rr.user_id = auth.uid()
ORDER BY rr.created_at DESC
LIMIT 5;

-- ============================================
-- 2. Revenue Distributions (if any)
-- ============================================
SELECT 
  '=== REVENUE DISTRIBUTIONS ===' as section,
  '' as details;

SELECT 
  rd.created_at,
  p.address as property,
  rd.total_revenue,
  rd.platform_share,
  rd.top_contributor_share,
  rd.other_contributors_share,
  rd.top_contributor_rating_count,
  (
    SELECT COUNT(*) 
    FROM contributor_payouts 
    WHERE revenue_distribution_id = rd.id
  ) as num_payouts_created
FROM revenue_distribution rd
JOIN report_redemption rr ON rr.id = rd.redemption_id
JOIN property p ON rd.property_id = p.id
WHERE rr.user_id = auth.uid()
ORDER BY rd.created_at DESC
LIMIT 5;

-- ============================================
-- 3. Contributor Payouts (WHO GOT PAID?)
-- ============================================
SELECT 
  '=== CONTRIBUTOR PAYOUTS ===' as section,
  '' as details;

SELECT 
  cp.created_at,
  p.address as for_property,
  au.email as contributor,
  CASE WHEN cp.is_top_contributor THEN '👑 TOP' ELSE '👥 Other' END as role,
  cp.rating_count as their_ratings,
  '$' || ROUND(cp.payout_amount::numeric, 2) as amount,
  cp.status
FROM contributor_payouts cp
JOIN revenue_distribution rd ON rd.id = cp.revenue_distribution_id
JOIN report_redemption rr ON rr.id = rd.redemption_id
JOIN property p ON rd.property_id = p.id
JOIN auth.users au ON cp.user_id = au.id
WHERE rr.user_id = auth.uid()
ORDER BY cp.created_at DESC, cp.is_top_contributor DESC
LIMIT 20;

-- ============================================
-- 4. Why Didn't Revenue Sharing Happen?
-- ============================================
SELECT 
  '=== PROPERTY RATING CHECK ===' as section,
  '' as details;

-- Check the property you just bought
WITH latest_redemption AS (
  SELECT property_id 
  FROM report_redemption 
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  p.id,
  p.name,
  p.address,
  COUNT(r.id) as total_ratings,
  COUNT(DISTINCT r.user_id) as unique_contributors,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ratings_last_30_days,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '365 days' THEN 1 END) as ratings_last_365_days,
  CASE 
    WHEN COUNT(r.id) = 0 THEN '❌ NO RATINGS - This is why no revenue sharing happened!'
    ELSE '✅ Has ratings - Revenue sharing should have happened'
  END as diagnosis
FROM property p
LEFT JOIN rating r ON r.property_id = p.id
WHERE p.id = (SELECT property_id FROM latest_redemption)
GROUP BY p.id, p.name, p.address;

-- ============================================
-- 5. Summary
-- ============================================
SELECT 
  '=== SUMMARY ===' as section,
  '' as details;

SELECT 
  (SELECT COUNT(*) FROM report_redemption WHERE user_id = auth.uid()) as total_redemptions_by_you,
  (SELECT COUNT(*) FROM revenue_distribution rd JOIN report_redemption rr ON rr.id = rd.redemption_id WHERE rr.user_id = auth.uid()) as revenue_distributions_created,
  (SELECT COUNT(*) FROM contributor_payouts cp JOIN revenue_distribution rd ON rd.id = cp.revenue_distribution_id JOIN report_redemption rr ON rr.id = rd.redemption_id WHERE rr.user_id = auth.uid()) as total_contributor_payouts,
  (SELECT SUM(cp.payout_amount) FROM contributor_payouts cp JOIN revenue_distribution rd ON rd.id = cp.revenue_distribution_id JOIN report_redemption rr ON rr.id = rd.redemption_id WHERE rr.user_id = auth.uid()) as total_paid_to_contributors;

