-- Grant ALL permissions to anon and authenticated for the rating table
-- This should eliminate any permission issues

-- Grant full access to the rating table
GRANT ALL ON rating TO anon;
GRANT ALL ON rating TO authenticated;
GRANT ALL ON rating TO service_role;

-- Grant usage on sequences (in case there are any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the grants
SELECT 
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges 
WHERE table_name = 'rating'
GROUP BY grantee
ORDER BY grantee;

