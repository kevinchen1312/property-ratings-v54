-- Find the problematic trigger and users table

-- 1. Check if there's a "users" table (different from app_user)
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name IN ('users', 'app_user')
ORDER BY table_name;

-- 2. Check the property_contributors table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'property_contributors'
ORDER BY ordinal_position;

-- 3. Check foreign keys on property_contributors
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'property_contributors'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 4. List all triggers on the rating table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'rating';

