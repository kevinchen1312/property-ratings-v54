-- Quick fix for the property_contributors foreign key issue
-- Option 1: Add all app_user records to the users table (if it exists)

-- First, check if users table exists and add missing users
INSERT INTO users (id, email)
SELECT 
    au.id,
    au.email
FROM app_user au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 
    COUNT(*) as users_synced,
    'Users synced from app_user to users table' as status
FROM users;

