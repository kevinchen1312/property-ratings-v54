-- Test Revenue Sharing Calculation
-- This script helps you verify the revenue sharing is working correctly

-- ============================================
-- PART 1: Check Recent Revenue Distributions
-- ============================================

SELECT 
  '=== RECENT REVENUE DISTRIBUTIONS ===' as section,
  '' as details;

SELECT 
  rd.created_at,
  p.name as property,
  rd.total_revenue,
  rd.platform_share as platform_80pct,
  rd.top_contributor_share as top_contributor_10pct,
  rd.other_contributors_share as others_10pct,
  rd.top_contributor_rating_count,
  CASE 
    WHEN rd.redemption_id IS NOT NULL THEN '💳 Credit'
    WHEN rd.purchase_id IS NOT NULL THEN '💰 Direct'
  END as type
FROM revenue_distribution rd
LEFT JOIN property p ON rd.property_id = p.id
ORDER BY rd.created_at DESC
LIMIT 5;

-- ============================================
-- PART 2: Check Contributor Payouts Breakdown
-- ============================================

SELECT 
  '=== CONTRIBUTOR PAYOUTS BREAKDOWN ===' as section,
  '' as details;

WITH latest_distribution AS (
  SELECT id, property_id 
  FROM revenue_distribution 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  CASE WHEN cp.is_top_contributor THEN '👑 TOP' ELSE '👥 OTHER' END as type,
  au.email,
  cp.rating_count,
  cp.payout_amount,
  ROUND((cp.payout_amount / rd.total_revenue * 100)::numeric, 2) || '%' as percentage_of_total,
  cp.status
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
JOIN auth.users au ON cp.user_id = au.id
WHERE rd.id = (SELECT id FROM latest_distribution)
ORDER BY cp.is_top_contributor DESC, cp.payout_amount DESC;

-- ============================================
-- PART 3: Verify Math (Should Equal 100%)
-- ============================================

SELECT 
  '=== REVENUE DISTRIBUTION MATH CHECK ===' as section,
  '' as details;

WITH latest AS (
  SELECT * FROM revenue_distribution 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  total_revenue,
  platform_share,
  top_contributor_share,
  other_contributors_share,
  (platform_share + top_contributor_share + other_contributors_share) as sum_should_equal_total,
  CASE 
    WHEN ABS(total_revenue - (platform_share + top_contributor_share + other_contributors_share)) < 0.01 
    THEN '✅ CORRECT' 
    ELSE '❌ ERROR' 
  END as validation
FROM latest;

-- ============================================
-- PART 4: Top Contributor vs Others
-- ============================================

SELECT 
  '=== TOP CONTRIBUTOR VS OTHERS COMPARISON ===' as section,
  '' as details;

WITH latest_distribution AS (
  SELECT id, property_id, top_contributor_id, other_contributors_share
  FROM revenue_distribution 
  ORDER BY created_at DESC 
  LIMIT 1
),
other_contributors AS (
  SELECT 
    COUNT(*) as other_contributor_count,
    SUM(cp.payout_amount) as total_other_payout
  FROM contributor_payouts cp
  WHERE cp.revenue_distribution_id = (SELECT id FROM latest_distribution)
    AND cp.is_top_contributor = false
)
SELECT 
  'Top Contributor Gets' as metric,
  rd.top_contributor_share as amount,
  '10% flat' as calculation
FROM revenue_distribution rd
WHERE rd.id = (SELECT id FROM latest_distribution)
UNION ALL
SELECT 
  'Other Contributors Get (Total)' as metric,
  oc.total_other_payout as amount,
  '10% split ' || oc.other_contributor_count || ' ways' as calculation
FROM other_contributors oc;

-- ============================================
-- PART 5: Your Personal Payouts (if you're a contributor)
-- ============================================

SELECT 
  '=== YOUR PENDING EARNINGS ===' as section,
  '' as details;

SELECT 
  cp.created_at,
  p.name as property,
  cp.payout_amount,
  cp.rating_count as your_ratings,
  CASE WHEN cp.is_top_contributor THEN '👑 Top Contributor' ELSE '👥 Contributor' END as your_role,
  cp.status
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
LEFT JOIN property p ON rd.property_id = p.id
WHERE cp.user_id = auth.uid()
  AND cp.status = 'pending'
ORDER BY cp.created_at DESC
LIMIT 10;

-- ============================================
-- PART 6: Total Pending Payouts Summary
-- ============================================

SELECT 
  '=== PENDING PAYOUTS SUMMARY ===' as section,
  '' as details;

SELECT 
  COUNT(DISTINCT user_id) as total_contributors,
  COUNT(*) as total_payout_records,
  SUM(payout_amount) as total_pending_amount,
  MIN(payout_amount) as smallest_payout,
  MAX(payout_amount) as largest_payout,
  AVG(payout_amount) as average_payout
FROM contributor_payouts
WHERE status = 'pending';

-- ============================================
-- PART 7: Property Contributors Stats
-- ============================================

SELECT 
  '=== PROPERTY CONTRIBUTORS (for latest redemption) ===' as section,
  '' as details;

WITH latest_property AS (
  SELECT property_id 
  FROM revenue_distribution 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  au.email,
  COUNT(*) as total_ratings,
  MIN(r.created_at) as first_rating,
  MAX(r.created_at) as last_rating,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ratings_last_30_days,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '365 days' THEN 1 END) as ratings_last_365_days
FROM rating r
JOIN auth.users au ON r.user_id = au.id
WHERE r.property_id = (SELECT property_id FROM latest_property)
GROUP BY au.email
ORDER BY total_ratings DESC;

