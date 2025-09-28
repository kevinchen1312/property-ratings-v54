-- Test if debit_credits function exists and works
-- Run this in your Supabase SQL Editor to verify the function

-- Check if the function exists
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'debit_credits';

-- Check if user_credits table exists and has data
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'user_credits'
ORDER BY ordinal_position;

-- Show current user credits (if any)
SELECT 
  user_id,
  credits,
  created_at,
  updated_at
FROM user_credits
ORDER BY created_at DESC
LIMIT 5;

-- Test the debit_credits function with a safe test
-- (This will only work if you have credits and replace 'your-user-id' with actual UUID)
-- SELECT debit_credits('your-user-id'::uuid, 0) as test_result;
