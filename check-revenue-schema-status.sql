-- Check Revenue Sharing Schema Status
-- Run this to see what's already set up and what's missing

-- ============================================
-- Check if tables exist
-- ============================================
SELECT 
  '=== REQUIRED TABLES ===' as check_type,
  '' as status;

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('property_contributors'),
    ('revenue_distribution'),
    ('contributor_payouts'),
    ('report_redemption')
) AS required_tables(table_name);

-- ============================================
-- Check revenue_distribution columns
-- ============================================
SELECT 
  '=== REVENUE_DISTRIBUTION COLUMNS ===' as check_type,
  '' as status;

SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'redemption_id' THEN '🆕 NEW (for credit system)'
    WHEN column_name = 'purchase_id' THEN '📦 EXISTING (for direct purchases)'
    ELSE ''
  END as notes
FROM information_schema.columns
WHERE table_name = 'revenue_distribution'
  AND column_name IN ('purchase_id', 'redemption_id', 'property_id', 'total_revenue')
ORDER BY ordinal_position;

-- ============================================
-- Check if get_top_contributor function exists
-- ============================================
SELECT 
  '=== DATABASE FUNCTIONS ===' as check_type,
  '' as status;

SELECT 
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_top_contributor', 'update_contributor_stats')
ORDER BY routine_name;

-- ============================================
-- Summary
-- ============================================
SELECT 
  '=== MIGRATION STATUS ===' as check_type,
  '' as status;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'revenue_distribution' 
        AND column_name = 'redemption_id'
    ) THEN '✅ MIGRATION COMPLETE - System ready for credit-based revenue sharing'
    ELSE '⚠️  MIGRATION NEEDED - Please run credit-revenue-sharing-migration.sql'
  END as migration_status;

