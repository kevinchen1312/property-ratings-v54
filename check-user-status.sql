-- Check the current authentication status and user records
-- This will help us understand what's going on

-- 1. List all users in auth.users (the authentication table)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. List all users in app_user (your application table)
SELECT 
  id,
  email,
  created_at
FROM app_user
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any users in auth.users that DON'T exist in app_user
SELECT 
  au.id,
  au.email,
  'Missing from app_user!' as status
FROM auth.users au
LEFT JOIN app_user ap ON au.id = ap.id
WHERE ap.id IS NULL
ORDER BY au.created_at DESC;

