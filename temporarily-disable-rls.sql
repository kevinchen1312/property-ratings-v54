-- Temporarily disable RLS to test if that's the issue
-- This will help us confirm the problem is with RLS policies

ALTER TABLE rating DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rating';

