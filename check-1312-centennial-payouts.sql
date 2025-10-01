-- Check Revenue Sharing for 1312 Centennial Court
-- This query shows what happened when you bought the report

-- ============================================
-- PART 1: Find the Property
-- ============================================
SELECT 
  '=== PROPERTY INFO ===' as section,
  '' as details;

SELECT 
  id as property_id,
  name,
  address,
  (SELECT COUNT(*) FROM rating WHERE property_id = p.id) as total_ratings_all_time,
  (SELECT COUNT(DISTINCT user_id) FROM rating WHERE property_id = p.id) as total_contributors
FROM property p
WHERE address ILIKE '%1312 centennial%'
   OR name ILIKE '%1312 centennial%';

-- ============================================
-- PART 2: Check Your Recent Redemption/Purchase
-- ============================================
SELECT 
  '=== YOUR RECENT TRANSACTION ===' as section,
  '' as details;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312 centennial%' 
     OR name ILIKE '%1312 centennial%'
  LIMIT 1
)
-- Check for credit redemption
SELECT 
  'Credit Redemption' as transaction_type,
  rr.id as transaction_id,
  rr.created_at,
  rr.credits_used,
  rr.revenue_value,
  CASE 
    WHEN rd.id IS NOT NULL THEN '✅ Revenue sharing processed'
    ELSE '❌ No revenue distribution found'
  END as revenue_status
FROM report_redemption rr
LEFT JOIN revenue_distribution rd ON rd.redemption_id = rr.id
WHERE rr.property_id = (SELECT id FROM property_info)
  AND rr.user_id = auth.uid()
ORDER BY rr.created_at DESC
LIMIT 1;

-- ============================================
-- PART 3: Revenue Distribution Breakdown
-- ============================================
SELECT 
  '=== REVENUE DISTRIBUTION ($10 TOTAL) ===' as section,
  '' as details;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312 centennial%' 
     OR name ILIKE '%1312 centennial%'
  LIMIT 1
)
SELECT 
  rd.created_at as when_distributed,
  rd.total_revenue as total,
  rd.platform_share as platform_80pct,
  rd.top_contributor_share as top_contributor_10pct,
  rd.other_contributors_share as others_10pct,
  rd.top_contributor_rating_count as top_contributor_had_n_ratings,
  CASE 
    WHEN rd.redemption_id IS NOT NULL THEN '💳 Credit Redemption'
    WHEN rd.purchase_id IS NOT NULL THEN '💰 Direct Purchase'
  END as source_type
FROM revenue_distribution rd
WHERE rd.property_id = (SELECT id FROM property_info)
ORDER BY rd.created_at DESC
LIMIT 1;

-- ============================================
-- PART 4: Who Got Paid? (The Money Shot!)
-- ============================================
SELECT 
  '=== CONTRIBUTOR PAYOUTS (WHO GOT PAID) ===' as section,
  '' as details;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312 centennial%' 
     OR name ILIKE '%1312 centennial%'
  LIMIT 1
),
latest_distribution AS (
  SELECT id FROM revenue_distribution 
  WHERE property_id = (SELECT id FROM property_info)
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  CASE 
    WHEN cp.is_top_contributor THEN '👑 TOP CONTRIBUTOR'
    ELSE '👥 Other Contributor #' || ROW_NUMBER() OVER (PARTITION BY cp.is_top_contributor ORDER BY cp.payout_amount DESC)
  END as role,
  au.email as contributor_email,
  cp.rating_count as their_ratings,
  '$' || ROUND(cp.payout_amount::numeric, 2) as payout_amount,
  ROUND((cp.payout_amount / 10.00 * 100)::numeric, 2) || '%' as percent_of_total,
  cp.status
FROM contributor_payouts cp
JOIN auth.users au ON cp.user_id = au.id
WHERE cp.revenue_distribution_id = (SELECT id FROM latest_distribution)
ORDER BY cp.is_top_contributor DESC, cp.payout_amount DESC;

-- ============================================
-- PART 5: All Contributors for This Property
-- ============================================
SELECT 
  '=== ALL CONTRIBUTORS TO THIS PROPERTY ===' as section,
  '' as details;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312 centennial%' 
     OR name ILIKE '%1312 centennial%'
  LIMIT 1
)
SELECT 
  au.email,
  COUNT(*) as total_ratings,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ratings_last_30_days,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '365 days' THEN 1 END) as ratings_last_365_days,
  MIN(r.created_at) as first_rating_date,
  MAX(r.created_at) as last_rating_date
FROM rating r
JOIN auth.users au ON r.user_id = au.id
WHERE r.property_id = (SELECT id FROM property_info)
GROUP BY au.email
ORDER BY total_ratings DESC;

-- ============================================
-- PART 6: Summary
-- ============================================
SELECT 
  '=== SUMMARY ===' as section,
  '' as details;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312 centennial%' 
     OR name ILIKE '%1312 centennial%'
  LIMIT 1
),
latest_distribution AS (
  SELECT id FROM revenue_distribution 
  WHERE property_id = (SELECT id FROM property_info)
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  (SELECT COUNT(*) FROM contributor_payouts WHERE revenue_distribution_id = (SELECT id FROM latest_distribution)) as total_contributors_paid,
  '$' || ROUND((SELECT SUM(payout_amount) FROM contributor_payouts WHERE revenue_distribution_id = (SELECT id FROM latest_distribution))::numeric, 2) as total_paid_out,
  (SELECT COUNT(*) FROM contributor_payouts WHERE revenue_distribution_id = (SELECT id FROM latest_distribution) AND is_top_contributor = true) as top_contributors,
  (SELECT COUNT(*) FROM contributor_payouts WHERE revenue_distribution_id = (SELECT id FROM latest_distribution) AND is_top_contributor = false) as other_contributors;

