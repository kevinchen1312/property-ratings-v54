-- Properly fix RLS for rating table
-- This maintains security while allowing authenticated users to insert ratings

-- 1. Enable RLS (if not already)
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing rating policies
DROP POLICY IF EXISTS "Users can view all ratings" ON rating;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can update their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON rating;
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON rating;
DROP POLICY IF EXISTS "Anyone can view ratings" ON rating;

-- 3. Create proper policies
-- Allow everyone to view ratings
CREATE POLICY "Anyone can view ratings" ON rating
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own ratings
-- This is the key policy that was failing
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

-- 4. Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON rating TO authenticated;
GRANT SELECT ON rating TO anon;

-- 5. Verify policies are set up
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual 
FROM pg_policies 
WHERE tablename = 'rating'
ORDER BY cmd;

-- 6. Test if current user can theoretically insert
SELECT 
    auth.uid() as current_user,
    auth.role() as current_role,
    EXISTS(SELECT 1 FROM app_user WHERE id::text = auth.uid()::text) as user_exists,
    CASE 
        WHEN auth.role() = 'authenticated' THEN '✅ Can insert'
        ELSE '❌ Not authenticated'
    END as insert_status;

