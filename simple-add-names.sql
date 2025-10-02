-- Simple migration to add name support
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Step 1: Add columns (will skip if they already exist)
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Step 2: Drop old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS sync_user_profile();

-- Step 3: Create simple sync function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_user (
    id, 
    email, 
    first_name, 
    last_name, 
    full_name, 
    display_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Sync any existing auth users to app_user
INSERT INTO app_user (id, email, display_name)
SELECT id, email, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM app_user)
ON CONFLICT (id) DO NOTHING;

-- Verify it worked
SELECT 
  'Migration complete! Columns added:' as status,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_user' AND column_name = 'first_name'
  ) as has_first_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_user' AND column_name = 'last_name'
  ) as has_last_name,
  COUNT(*) as total_users
FROM app_user;

