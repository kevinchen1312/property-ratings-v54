-- ========================================
-- USER NAMES MIGRATION
-- Adds first_name, last_name, and full_name to app_user table
-- Run this in Supabase SQL Editor
-- ========================================

-- STEP 1: Add columns to app_user table
DO $$ 
BEGIN
  -- Check if first_name column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_user' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE app_user ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column';
  ELSE
    RAISE NOTICE 'first_name column already exists';
  END IF;

  -- Check if last_name column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_user' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE app_user ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column';
  ELSE
    RAISE NOTICE 'last_name column already exists';
  END IF;

  -- Check if full_name column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_user' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE app_user ADD COLUMN full_name TEXT;
    RAISE NOTICE 'Added full_name column';
  ELSE
    RAISE NOTICE 'full_name column already exists';
  END IF;
END $$;

-- STEP 2: Create function to handle user sync with proper conflict resolution
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if app_user table has the name columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_user' 
    AND column_name = 'first_name'
  ) THEN
    -- Insert with name columns
    INSERT INTO app_user (id, email, first_name, last_name, full_name, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      full_name = EXCLUDED.full_name,
      display_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email);
  ELSE
    -- Fallback: Insert without name columns (for older schema)
    INSERT INTO app_user (id, email, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.email
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- STEP 4: Backfill existing users with name data from auth metadata
DO $$
BEGIN
  -- Only try to update name columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'app_user' 
    AND column_name = 'first_name'
  ) THEN
    -- Update existing users with name data
    UPDATE app_user 
    SET 
      first_name = u.raw_user_meta_data->>'first_name',
      last_name = u.raw_user_meta_data->>'last_name',
      full_name = u.raw_user_meta_data->>'full_name',
      display_name = COALESCE(u.raw_user_meta_data->>'full_name', app_user.email)
    FROM auth.users u
    WHERE app_user.id = u.id
    AND u.raw_user_meta_data->>'first_name' IS NOT NULL;
    
    RAISE NOTICE 'Updated existing users with name data';
  END IF;
END $$;

-- STEP 5: Ensure all auth users have corresponding app_user records
INSERT INTO app_user (id, email, display_name)
SELECT 
  au.id,
  au.email,
  au.email
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM app_user 
  WHERE app_user.id = au.id
)
ON CONFLICT (id) DO NOTHING;

SELECT 
  '✅ User names migration completed successfully!' as status,
  COUNT(*) as total_users
FROM app_user;

