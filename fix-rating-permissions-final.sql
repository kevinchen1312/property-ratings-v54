-- FINAL FIX for rating submission permission errors
-- This addresses the "You do not have permission to submit ratings" error
-- Run this in Supabase SQL Editor

-- 1. First, let's disable RLS temporarily to ensure we can make changes
ALTER TABLE rating DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all ratings" ON rating;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can update their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON rating;
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON rating;
DROP POLICY IF EXISTS "Anyone can view ratings" ON rating;
DROP POLICY IF EXISTS "Enable read access for all users" ON rating;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON rating;

-- 3. Grant necessary permissions to roles
GRANT SELECT ON rating TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON rating TO authenticated;

-- 4. Re-enable RLS
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- 5. Create new, working policies
-- Allow everyone to view ratings (public data)
CREATE POLICY "Anyone can view ratings" ON rating
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own ratings
-- This is the critical policy that fixes the permission error
CREATE POLICY "Authenticated users can insert ratings" ON rating
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND auth.uid()::text = user_id::text
    );

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own ratings" ON rating
    FOR UPDATE 
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Allow users to delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON rating
    FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- 6. Verify the fix worked
SELECT 
    'RLS Status Check:' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rating'

UNION ALL

SELECT 
    'Policy Check:' as check_type,
    policyname as tablename,
    cmd as rls_enabled
FROM pg_policies 
WHERE tablename = 'rating'
ORDER BY check_type, tablename;

-- 7. Test authentication readiness
SELECT 
    'Auth Test:' as test_type,
    CASE 
        WHEN auth.uid() IS NULL THEN 'Not authenticated - please log in to app first'
        WHEN auth.role() = 'authenticated' THEN 'Ready to submit ratings ✅'
        ELSE 'Unexpected role: ' || auth.role()
    END as status,
    auth.uid() as user_id;

-- 8. Final verification message
SELECT 
    '🎉 Rating permissions have been fixed!' as message,
    'Users should now be able to submit ratings' as next_step,
    'If still having issues, run debug-rating-permissions.sql' as troubleshooting;

