-- Re-enable RLS with proper policies now that everything works
-- Only run this if you want to restore security

-- 1. Re-enable RLS on rating table
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view ratings" ON rating;
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON rating;
DROP POLICY IF EXISTS "Users can update their own ratings" ON rating;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON rating;

-- Create proper policies
CREATE POLICY "Anyone can view ratings" ON rating
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ratings" ON rating
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON rating
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON rating
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 2. Re-enable RLS on property_contributors (but with a bypass for triggers)
ALTER TABLE property_contributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own contributions" ON property_contributors;
DROP POLICY IF EXISTS "System can manage contributions" ON property_contributors;

-- Allow users to view their own stats
CREATE POLICY "Users can view their own contributions" ON property_contributors
    FOR SELECT USING (auth.uid() = user_id);

-- CRITICAL: Allow authenticated users to insert/update (needed for trigger)
CREATE POLICY "Authenticated users can insert contributions" ON property_contributors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update contributions" ON property_contributors
    FOR UPDATE USING (true);

-- 3. Re-enable RLS on other tables
ALTER TABLE contributor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts" ON contributor_payouts
    FOR SELECT USING (auth.uid() = user_id);

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('rating', 'property_contributors', 'contributor_payouts', 'revenue_distribution')
ORDER BY tablename;

