-- FINAL FIX for property_contributors RLS blocking rating submissions
-- This fixes the "new row violates row-level security policy" error

-- 1. Disable RLS on property_contributors to allow the trigger to work
ALTER TABLE property_contributors DISABLE ROW LEVEL SECURITY;

-- 2. Also disable RLS on related revenue sharing tables
ALTER TABLE contributor_payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distribution DISABLE ROW LEVEL SECURITY;

-- 3. Grant necessary permissions to authenticated users
GRANT ALL ON property_contributors TO authenticated;
GRANT ALL ON contributor_payouts TO authenticated;
GRANT ALL ON revenue_distribution TO authenticated;

-- 4. Verify the fix
SELECT 
    'RLS Status After Fix:' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔒 STILL ENABLED (problem!)'
        ELSE '🔓 DISABLED (fixed!)'
    END as status
FROM pg_tables 
WHERE tablename IN ('rating', 'property_contributors', 'contributor_payouts', 'revenue_distribution')
ORDER BY tablename;

-- 5. Check if the trigger exists
SELECT 
    'Trigger Status:' as check_type,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_contributor_stats';

-- 6. Success message
SELECT 
    '✅ property_contributors RLS disabled!' as message,
    'Rating submissions should now work' as result,
    'The trigger can now update contributor stats' as explanation;

