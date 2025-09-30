-- Test if we can insert ratings directly into the database
-- This will help us determine if the issue is app-side or database-side

-- 1. Check current RLS status
SELECT 
    'Current RLS Status:' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ENABLED (may block inserts)'
        ELSE '🔓 RLS DISABLED (should allow inserts)'
    END as status
FROM pg_tables 
WHERE tablename = 'rating';

-- 2. Check if we have users and properties to work with
SELECT 'User Count:' as check_type, COUNT(*)::text as count FROM app_user
UNION ALL
SELECT 'Property Count:' as check_type, COUNT(*)::text as count FROM property;

-- 3. Try to insert a test rating manually (this should work if RLS is truly disabled)
DO $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
    insert_success BOOLEAN := FALSE;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM app_user LIMIT 1;
    
    -- Get a test property  
    SELECT id INTO test_property_id FROM property LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_property_id IS NOT NULL THEN
        -- Try the insert
        INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng)
        VALUES (test_user_id, test_property_id, 'noise', 4, 37.3, -122.0);
        
        insert_success := TRUE;
        
        RAISE NOTICE '✅ Manual insert SUCCESS - Database allows inserts';
        
        -- Clean up the test rating
        DELETE FROM rating 
        WHERE user_id = test_user_id 
          AND property_id = test_property_id 
          AND attribute = 'noise' 
          AND stars = 4;
          
    ELSE
        RAISE NOTICE '❌ No test data available (user_id: %, property_id: %)', test_user_id, test_property_id;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual insert FAILED: %', SQLERRM;
END $$;

-- 4. Final diagnosis
SELECT 
    CASE 
        WHEN NOT EXISTS(SELECT 1 FROM app_user) THEN '❌ No users in app_user table'
        WHEN NOT EXISTS(SELECT 1 FROM property) THEN '❌ No properties available'
        ELSE '✅ Database should be ready for inserts'
    END as diagnosis;

