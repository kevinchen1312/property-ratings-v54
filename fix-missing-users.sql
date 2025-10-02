-- Fix: Add missing users from auth.users to app_user
-- This will sync any users who signed up but didn't get added to app_user

-- Add all auth users who are missing from app_user
INSERT INTO app_user (id, email, first_name, last_name, full_name, display_name, created_at)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as first_name,
  au.raw_user_meta_data->>'last_name' as last_name,
  au.raw_user_meta_data->>'full_name' as full_name,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as display_name,
  au.created_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM app_user)
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 
  'Fixed! Added ' || COUNT(*) || ' missing users' as result
FROM auth.users au
WHERE au.id IN (SELECT id FROM app_user);

-- Show the users we just added
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at
FROM app_user
ORDER BY created_at DESC
LIMIT 10;

