-- Diagnostic: Check if migration worked
-- Run this in Supabase SQL Editor to see what's wrong

-- Check 1: Do the columns exist?
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'app_user'
ORDER BY ordinal_position;

-- Check 2: Does the trigger exist?
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- Check 3: Does the function exist?
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'sync_user_profile')
  AND routine_schema = 'public';

-- Check 4: Try to see recent auth users
SELECT 
  id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check 5: See if any users made it to app_user
SELECT 
  id,
  email,
  first_name,
  last_name,
  full_name,
  created_at
FROM app_user
ORDER BY created_at DESC
LIMIT 5;

