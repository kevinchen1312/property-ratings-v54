-- Manually add authenticated users to app_user table
-- Since auth.uid() doesn't work in SQL Editor, we'll insert all auth users

-- Insert ALL authenticated users from auth.users into app_user if they don't exist
INSERT INTO app_user (id, email, created_at)
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM app_user ap WHERE ap.id = au.id
);

-- Show the results
SELECT 
  COUNT(*) as users_added,
  'Users successfully added to app_user table!' as status
FROM app_user;

