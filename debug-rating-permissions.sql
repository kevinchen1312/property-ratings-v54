-- Debug script to check current rating table permissions and RLS status
-- Run this in Supabase SQL Editor to diagnose the permission issue

-- 1. Check if RLS is enabled on rating table
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ENABLED' 
        ELSE '🔓 RLS DISABLED' 
    END as status
FROM pg_tables 
WHERE tablename = 'rating';

-- 2. Check current RLS policies on rating table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd as operation,
    qual as using_condition,
    with_check as check_condition
FROM pg_policies 
WHERE tablename = 'rating'
ORDER BY cmd, policyname;

-- 3. Check grants on rating table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'rating'
ORDER BY grantee, privilege_type;

-- 4. Test current user authentication status
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
        WHEN auth.role() = 'authenticated' THEN '✅ AUTHENTICATED'
        ELSE '⚠️ UNKNOWN ROLE: ' || auth.role()
    END as auth_status;

-- 5. Check if current user exists in app_user table
SELECT 
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ No auth.uid()'
        WHEN EXISTS(SELECT 1 FROM app_user WHERE id::text = auth.uid()::text) THEN '✅ User exists in app_user'
        ELSE '❌ User NOT found in app_user table'
    END as user_exists_status,
    auth.uid() as auth_uid,
    (SELECT id FROM app_user WHERE id::text = auth.uid()::text LIMIT 1) as app_user_id;

-- 6. Test if we can theoretically insert a rating (dry run)
SELECT 
    'Test rating insert conditions:' as test_title,
    auth.uid() IS NOT NULL as has_auth_uid,
    auth.role() = 'authenticated' as is_authenticated_role,
    EXISTS(SELECT 1 FROM app_user WHERE id::text = auth.uid()::text) as user_in_app_user,
    EXISTS(SELECT 1 FROM property LIMIT 1) as has_properties,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
        WHEN auth.role() != 'authenticated' THEN '❌ Wrong role: ' || auth.role()
        WHEN NOT EXISTS(SELECT 1 FROM app_user WHERE id::text = auth.uid()::text) THEN '❌ User not in app_user table'
        WHEN NOT EXISTS(SELECT 1 FROM property LIMIT 1) THEN '❌ No properties available'
        ELSE '✅ Should be able to insert ratings'
    END as insert_readiness;

