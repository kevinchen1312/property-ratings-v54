-- Debug queries to understand the rating submission issue

-- 1. Check if rating table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rating' 
ORDER BY ordinal_position;

-- 2. Check current permissions on rating table
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'rating';

-- 3. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rating';

-- 4. Check existing policies (should be none after our nuclear fix)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'rating';

-- 5. Try a direct insert (this should work)
INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng) 
VALUES (
  'd0a25789-37c7-4816-9b5a-0e7f9305da76',  -- Your user ID from the logs
  (SELECT id FROM property LIMIT 1),        -- Any property ID
  'noise', 
  4, 
  37.313964, 
  -122.069473
) 
RETURNING *;
