-- Disable RLS on property_contributors to allow the trigger to work
-- The trigger update_contributor_stats() runs when ratings are inserted
-- and it needs to update property_contributors

-- Disable RLS on all revenue sharing tables
ALTER TABLE property_contributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distribution DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON property_contributors TO authenticated;
GRANT ALL ON contributor_payouts TO authenticated;
GRANT ALL ON revenue_distribution TO authenticated;

-- Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('property_contributors', 'contributor_payouts', 'revenue_distribution')
ORDER BY tablename;

