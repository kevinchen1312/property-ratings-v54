-- Check all permissions and grants for the rating table
-- This will help us understand what's blocking the insert

-- 1. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'rating'
ORDER BY grantee, privilege_type;

-- 2. Check if anon and authenticated roles have INSERT permission
SELECT 
    'anon' as role,
    has_table_privilege('anon', 'rating', 'INSERT') as can_insert,
    has_table_privilege('anon', 'rating', 'SELECT') as can_select;

SELECT 
    'authenticated' as role,
    has_table_privilege('authenticated', 'rating', 'INSERT') as can_insert,
    has_table_privilege('authenticated', 'rating', 'SELECT') as can_select;

-- 3. Check for any active triggers on the rating table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'rating';

-- 4. Check the rating table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rating'
ORDER BY ordinal_position;

