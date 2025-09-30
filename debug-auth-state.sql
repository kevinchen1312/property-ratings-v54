-- Debug authentication and user ID mismatch
-- Run this to see if there's a mismatch between auth.uid() and app_user.id

-- 1. Check what auth.uid() returns (should be your current user ID)
SELECT auth.uid() as current_auth_uid;

-- 2. Check users in app_user table
SELECT id, email, created_at 
FROM app_user 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if your auth user exists in app_user
SELECT 
  auth.uid() as auth_uid,
  u.id as app_user_id,
  u.email,
  CASE 
    WHEN auth.uid()::text = u.id::text THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM app_user u
WHERE u.id::text = auth.uid()::text;

-- 4. Check recent ratings to see what user_ids are being used
SELECT user_id, property_id, attribute, created_at 
FROM rating 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Test if you can insert a rating directly
-- Replace 'YOUR_USER_ID' and 'YOUR_PROPERTY_ID' with actual values
DO $$
DECLARE
  test_user_id TEXT;
  test_property_id TEXT;
BEGIN
  -- Get current user
  test_user_id := auth.uid()::text;
  
  -- Get any property
  SELECT id::text INTO test_property_id FROM property LIMIT 1;
  
  RAISE NOTICE 'Testing insert with user_id: %, property_id: %', test_user_id, test_property_id;
  
  -- This should fail with the same error if RLS is the issue
  -- Comment out if you don't want to actually insert
  -- INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng)
  -- VALUES (test_user_id, test_property_id, 'noise', 4, 37.3, -122.0);
  
END $$;

