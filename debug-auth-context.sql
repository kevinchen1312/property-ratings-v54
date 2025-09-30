-- Debug authentication context issues
-- This will help us understand why auth.uid() is NULL during inserts

-- 1. Check if we can manually insert a rating (bypassing RLS completely)
-- First, let's see what users exist
SELECT 
    'Available Users:' as info,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- 2. Check app_user table
SELECT 
    'App Users:' as info,
    id,
    email,
    created_at
FROM app_user
ORDER BY created_at DESC
LIMIT 3;

-- 3. Try a manual insert with a real user ID (this should work with RLS disabled)
-- Replace 'USER_ID_HERE' with an actual user ID from above
INSERT INTO rating (
    user_id, 
    property_id, 
    attribute, 
    stars, 
    user_lat, 
    user_lng
) 
SELECT 
    (SELECT id FROM app_user LIMIT 1) as user_id,
    (SELECT id FROM property LIMIT 1) as property_id,
    'noise' as attribute,
    4 as stars,
    37.3 as user_lat,
    -122.0 as user_lng
WHERE EXISTS(SELECT 1 FROM app_user)
  AND EXISTS(SELECT 1 FROM property);

-- 4. Check if the insert worked
SELECT 
    'Test Insert Result:' as info,
    COUNT(*) as rating_count,
    MAX(created_at) as latest_rating
FROM rating
WHERE attribute = 'noise' AND stars = 4;

-- 5. Clean up the test rating
DELETE FROM rating 
WHERE attribute = 'noise' 
  AND stars = 4 
  AND user_lat = 37.3 
  AND user_lng = -122.0;

-- 6. Final status
SELECT 
    'Database Test Complete' as status,
    'If insert worked, the issue is in the app auth context' as conclusion;

