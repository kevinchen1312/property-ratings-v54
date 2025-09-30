-- Investigation script for authentication sync issues
-- Run this to understand why auth.uid() is NULL in the app context

-- 1. Check if there are any users in the auth.users table
SELECT 
    'Auth Users Check:' as check_type,
    COUNT(*) as user_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'No users found in auth.users'
        ELSE COUNT(*)::text || ' users found'
    END as status
FROM auth.users;

-- 2. Check if there are users in app_user table
SELECT 
    'App Users Check:' as check_type,
    COUNT(*) as user_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'No users found in app_user'
        ELSE COUNT(*)::text || ' users found'
    END as status
FROM app_user;

-- 3. Check for any mismatches between auth.users and app_user
SELECT 
    'User Sync Check:' as check_type,
    'Checking for orphaned records...' as status,
    '' as user_count;

-- Users in auth.users but not in app_user
SELECT 
    'Orphaned Auth Users:' as check_type,
    au.email,
    au.id as auth_id
FROM auth.users au
LEFT JOIN app_user ap ON au.id::text = ap.id::text
WHERE ap.id IS NULL
LIMIT 5;

-- Users in app_user but not in auth.users  
SELECT 
    'Orphaned App Users:' as check_type,
    ap.email,
    ap.id as app_user_id
FROM app_user ap
LEFT JOIN auth.users au ON ap.id::text = au.id::text
WHERE au.id IS NULL
LIMIT 5;

-- 4. Check recent auth activity
SELECT 
    'Recent Auth Activity:' as check_type,
    email,
    last_sign_in_at,
    created_at
FROM auth.users
ORDER BY last_sign_in_at DESC NULLS LAST
LIMIT 3;

