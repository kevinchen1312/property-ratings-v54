-- Test to verify that authenticated requests are actually working
-- This will help us understand if the app is sending auth tokens properly

-- 1. Check if there are ANY recent rating attempts (even failed ones) in the logs
-- Note: This might not show anything if there's no query log

-- 2. Verify the rating table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rating'
ORDER BY ordinal_position;

-- 3. Check all triggers that might be blocking inserts
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'rating'
AND action_timing = 'BEFORE';

-- 4. Try a completely manual insert with a known user
-- First get a valid user and property
SELECT 
    'User for testing:' as info,
    id,
    email 
FROM app_user 
LIMIT 1;

SELECT 
    'Property for testing:' as info,
    id,
    name,
    address
FROM property 
LIMIT 1;

