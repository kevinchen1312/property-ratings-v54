-- Stripe Connect Setup Validation
-- Run this to verify all tables, functions, and policies are correctly set up
--
-- Usage: Run in Supabase SQL Editor
-- Expected: All checks should return 'OK' or show expected counts

-- =========================================
-- Stripe Connect Setup Validation
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Stripe Connect Setup Validation';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;

-- Check 1: Verify all required tables exist
DO $$
BEGIN
  RAISE NOTICE '✓ Check 1: Required Tables';
  RAISE NOTICE '';
END $$;

SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ All 5 tables exist'
    ELSE '❌ Missing tables! Found: ' || COUNT(*)::text
  END as "Check 1: Tables Status"
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  );

-- List tables with their details
SELECT 
  'Table Inventory' as "Section",
  t.table_name as "Table",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "Columns",
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as "Size"
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_name IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  )
ORDER BY t.table_name;

-- Check 2: Verify RLS is enabled
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 2: Row Level Security (RLS)';
  RAISE NOTICE '';
END $$;

SELECT 
  'RLS Status' as "Section",
  tablename as "Table",
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  )
ORDER BY tablename;

-- Check 3: Verify RLS policies exist
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 3: RLS Policies';
  RAISE NOTICE '';
END $$;

SELECT 
  'RLS Policies' as "Section",
  tablename as "Table",
  COUNT(*) as "Policy Count",
  string_agg(policyname, ', ' ORDER BY policyname) as "Policies"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  )
GROUP BY tablename
ORDER BY tablename;

-- Check 4: Verify indexes exist
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 4: Database Indexes';
  RAISE NOTICE '';
END $$;

SELECT 
  'Database Indexes' as "Section",
  tablename as "Table",
  indexname as "Index Name"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  )
ORDER BY tablename, indexname;

-- Check 5: Verify functions exist
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 5: Database Functions';
  RAISE NOTICE '';
END $$;

SELECT 
  'Database Functions' as "Section",
  routine_name as "Function",
  routine_type as "Type",
  data_type as "Returns"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_stripe_connect_status',
    'get_pending_payouts_for_batch',
    'update_contributor_stats',
    'get_top_contributor'
  )
ORDER BY routine_name;

-- Check 6: Verify triggers exist
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 6: Database Triggers';
  RAISE NOTICE '';
END $$;

SELECT 
  'Database Triggers' as "Section",
  trigger_name as "Trigger",
  event_object_table as "Table",
  action_timing || ' ' || string_agg(event_manipulation, ', ') as "Events"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_update_contributor_stats',
    'trigger_update_user_stripe_accounts_updated_at'
  )
GROUP BY trigger_name, event_object_table, action_timing
ORDER BY trigger_name;

-- Check 7: Verify foreign keys
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 7: Foreign Key Constraints';
  RAISE NOTICE '';
END $$;

SELECT 
  'Foreign Keys' as "Section",
  tc.table_name as "Table",
  kcu.column_name as "Column",
  ccu.table_name as "References Table",
  ccu.column_name as "References Column"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Check 8: Validate critical columns
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 8: Critical Column Validations';
  RAISE NOTICE '';
END $$;

-- Check contributor_payouts status field
SELECT 
  'Column Validation' as "Section",
  'contributor_payouts.status' as "Field",
  data_type as "Type",
  CASE 
    WHEN data_type = 'text' THEN '✅ Correct (TEXT)'
    ELSE '❌ Wrong type: ' || data_type
  END as "Status"
FROM information_schema.columns
WHERE table_name = 'contributor_payouts'
  AND column_name = 'status';

-- Check user_stripe_accounts critical fields
SELECT 
  'user_stripe_accounts' as "Section",
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  column_default as "Default"
FROM information_schema.columns
WHERE table_name = 'user_stripe_accounts'
  AND column_name IN (
    'user_id',
    'stripe_account_id',
    'account_status',
    'payouts_enabled'
  )
ORDER BY column_name;

-- Check 9: Current data counts
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 9: Current Data Counts';
  RAISE NOTICE '';
END $$;

SELECT 'Data Counts' as "Section", 'user_stripe_accounts' as "Table", COUNT(*)::text as "Rows" FROM user_stripe_accounts
UNION ALL
SELECT 'Data Counts', 'contributor_payouts', COUNT(*)::text FROM contributor_payouts
UNION ALL
SELECT 'Data Counts', 'revenue_distribution', COUNT(*)::text FROM revenue_distribution
UNION ALL
SELECT 'Data Counts', 'property_contributors', COUNT(*)::text FROM property_contributors
UNION ALL
SELECT 'Data Counts', 'payout_batches', COUNT(*)::text FROM payout_batches
ORDER BY "Table";

-- Check 10: Stripe Connect accounts summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 10: Stripe Connect Accounts Summary';
  RAISE NOTICE '';
END $$;

SELECT 
  'Stripe Accounts' as "Section",
  COALESCE(account_status, 'No accounts') as "Status",
  COUNT(*) as "Count",
  COUNT(*) FILTER (WHERE payouts_enabled) as "Payouts Enabled"
FROM user_stripe_accounts
GROUP BY account_status
ORDER BY account_status;

-- Check 11: Payout status breakdown
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Check 11: Payout Status Breakdown';
  RAISE NOTICE '';
END $$;

SELECT 
  'Payout Summary' as "Section",
  COALESCE(status, 'No payouts') as "Status",
  COUNT(*) as "Count",
  COALESCE(SUM(payout_amount), 0) as "Total Amount",
  COALESCE(AVG(payout_amount), 0) as "Avg Amount"
FROM contributor_payouts
GROUP BY status
ORDER BY status;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Validation Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the results above:';
  RAISE NOTICE '- All tables should exist (5 total)';
  RAISE NOTICE '- RLS should be enabled on all tables';
  RAISE NOTICE '- Policies should exist for user access';
  RAISE NOTICE '- Indexes should be present for performance';
  RAISE NOTICE '- Functions and triggers should be created';
  RAISE NOTICE '';
  RAISE NOTICE 'If any checks show ❌, run the appropriate migration:';
  RAISE NOTICE '  1. revenue-sharing-schema-safe.sql';
  RAISE NOTICE '  2. stripe-connect-migration-safe.sql';
  RAISE NOTICE '';
END $$;