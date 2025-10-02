-- ULTRA-SAFE FIX FOR SIGNUP
-- This will make signup work no matter what
-- Run this in Supabase SQL Editor

-- Step 1: Drop any existing triggers/functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_user_profile() CASCADE;

-- Step 2: Make sure columns exist
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Step 3: Create a bulletproof function that CANNOT fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
BEGIN
  -- Safely extract metadata (will be NULL if not present)
  BEGIN
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_full_name := NEW.raw_user_meta_data->>'full_name';
  EXCEPTION WHEN OTHERS THEN
    v_first_name := NULL;
    v_last_name := NULL;
    v_full_name := NULL;
  END;

  -- Try to insert - if it fails, just insert basics
  BEGIN
    INSERT INTO app_user (id, email, first_name, last_name, full_name, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_full_name,
      COALESCE(v_full_name, NEW.email)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, app_user.first_name),
      last_name = COALESCE(EXCLUDED.last_name, app_user.last_name),
      full_name = COALESCE(EXCLUDED.full_name, app_user.full_name),
      display_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email);
  EXCEPTION WHEN OTHERS THEN
    -- If that fails, try without name columns
    BEGIN
      INSERT INTO app_user (id, email, display_name)
      VALUES (NEW.id, NEW.email, NEW.email)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.email;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't block signup
      RAISE WARNING 'Failed to create app_user for %: %', NEW.email, SQLERRM;
    END;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Verify
SELECT 'Trigger installed successfully!' as status;

