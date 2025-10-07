-- Fix RLS policies for user_credits so users can read their own credits

-- Check current RLS policies on user_credits
SELECT 
    'CURRENT RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_credits';

-- Drop old restrictive policies (if any)
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert their own credits" ON user_credits;

-- Create proper RLS policies
-- Allow users to SELECT their own credits
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow service role to manage all credits (for webhook)
CREATE POLICY "Service role can manage all credits" ON user_credits
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Verify the policies were created
SELECT 
    'NEW RLS POLICIES' as section,
    policyname,
    cmd,
    qual::text,
    with_check::text
FROM pg_policies 
WHERE tablename = 'user_credits';

-- Grant necessary permissions
GRANT SELECT ON user_credits TO authenticated;
GRANT ALL ON user_credits TO service_role;

-- Test if you can read your own credits
SELECT 
    'TEST: Can you read your credits?' as test,
    credits,
    created_at,
    updated_at
FROM user_credits
WHERE user_id = auth.uid();

-- Check if user_credits record exists for current user
SELECT 
    'Your user_id' as info,
    auth.uid() as user_id;

SELECT 
    'Credits record exists?' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_credits WHERE user_id = auth.uid()) 
        THEN '✅ YES'
        ELSE '❌ NO - Need to create it'
    END as status;
