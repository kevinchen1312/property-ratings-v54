-- Ensure the authenticated user exists in app_user table
-- This is needed for RLS policies to work

-- Insert the current authenticated user if they don't exist
INSERT INTO app_user (id, email, created_at)
SELECT 
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM app_user WHERE id = auth.uid()
);

-- Verify it worked
SELECT 
  id, 
  email, 
  created_at,
  'User record exists!' as status
FROM app_user 
WHERE id = auth.uid();
