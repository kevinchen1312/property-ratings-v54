-- Diagnose Revenue Sharing System Status
-- Run this to see what's set up and what's missing

-- ============================================
-- Check 1: Has the migration been run?
-- ============================================
SELECT 
  '=== STEP 1: Check if Migration Ran ===' as check,
  '' as result;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'report_redemption'
    ) THEN '✅ report_redemption table exists'
    ELSE '❌ MISSING - Run credit-revenue-sharing-migration.sql'
  END as report_redemption_table,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'revenue_distribution' 
        AND column_name = 'redemption_id'
    ) THEN '✅ redemption_id column exists'
    ELSE '❌ MISSING - Run credit-revenue-sharing-migration.sql'
  END as redemption_id_column;

-- ============================================
-- Check 2: Did you redeem a credit or buy directly?
-- ============================================
SELECT 
  '=== STEP 2: How Did You Buy the Report? ===' as check,
  '' as result;

-- Check for recent credit redemptions (any property)
SELECT 
  'Credit Redemption' as purchase_type,
  rr.created_at,
  p.name as property,
  p.address,
  rr.credits_used,
  '$' || rr.revenue_value as revenue
FROM report_redemption rr
JOIN property p ON rr.property_id = p.id
WHERE rr.user_id = auth.uid()
ORDER BY rr.created_at DESC
LIMIT 5;

-- ============================================
-- Check 3: Are there any revenue distributions at all?
-- ============================================
SELECT 
  '=== STEP 3: Any Revenue Distributions Exist? ===' as check,
  '' as result;

SELECT 
  COUNT(*) as total_revenue_distributions,
  COUNT(CASE WHEN redemption_id IS NOT NULL THEN 1 END) as from_credit_redemptions,
  COUNT(CASE WHEN purchase_id IS NOT NULL THEN 1 END) as from_direct_purchases,
  MAX(created_at) as most_recent
FROM revenue_distribution;

-- ============================================
-- Check 4: Check 1312 Centennial specifically
-- ============================================
SELECT 
  '=== STEP 4: 1312 Centennial Court Details ===' as check,
  '' as result;

SELECT 
  p.id as property_id,
  p.name,
  p.address,
  COUNT(DISTINCT r.user_id) as total_contributors,
  COUNT(r.id) as total_ratings,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ratings_last_30_days,
  MIN(r.created_at) as first_rating,
  MAX(r.created_at) as most_recent_rating
FROM property p
LEFT JOIN rating r ON r.property_id = p.id
WHERE p.address ILIKE '%1312 centennial%'
   OR p.name ILIKE '%1312 centennial%'
GROUP BY p.id, p.name, p.address;

-- ============================================
-- Check 5: Who are the contributors?
-- ============================================
SELECT 
  '=== STEP 5: Contributors to 1312 Centennial ===' as check,
  '' as result;

SELECT 
  au.email,
  COUNT(*) as rating_count,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ratings_last_30_days,
  MAX(r.created_at) as last_rating_date
FROM property p
JOIN rating r ON r.property_id = p.id
JOIN auth.users au ON r.user_id = au.id
WHERE p.address ILIKE '%1312 centennial%'
   OR p.name ILIKE '%1312 centennial%'
GROUP BY au.email
ORDER BY rating_count DESC;

-- ============================================
-- Check 6: Edge Function Logs Status
-- ============================================
SELECT 
  '=== NEXT STEPS ===' as info,
  '' as action;

SELECT 
  'If migration not run' as if_this,
  'Run: credit-revenue-sharing-migration.sql' as then_do_this
UNION ALL
SELECT 
  'If you bought before deploying',
  'Buy another report to test the new system'
UNION ALL
SELECT 
  'To check function logs',
  'Supabase Dashboard → Edge Functions → redeemReports → Logs';

