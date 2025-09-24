-- Sync current authenticated user to app_user table
-- This fixes the foreign key constraint error when submitting ratings

-- First, let's see what users exist in auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Insert the current user into app_user table (if not already exists)
INSERT INTO app_user (id, email, created_at)
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.email IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM app_user 
    WHERE app_user.id = au.id
);

-- Verify the user was added
SELECT id, email, created_at 
FROM app_user 
ORDER BY created_at DESC;

-- Check that we can now submit ratings (this should work without foreign key errors)
-- SELECT * FROM rating LIMIT 5;
