-- Update the get_uuid_for_clerk_user function to ALSO insert into profiles table
-- This fixes the foreign key constraint error when submitting ratings

CREATE OR REPLACE FUNCTION get_uuid_for_clerk_user(p_clerk_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- Try to get existing mapping
  SELECT supabase_user_id INTO v_uuid
  FROM clerk_user_mapping
  WHERE clerk_user_id = p_clerk_user_id;

  -- If not found, create new mapping with a generated UUID
  IF v_uuid IS NULL THEN
    v_uuid := gen_random_uuid();
    
    -- Insert the mapping
    INSERT INTO clerk_user_mapping (clerk_user_id, supabase_user_id)
    VALUES (p_clerk_user_id, v_uuid)
    ON CONFLICT (clerk_user_id) DO NOTHING;
    
    -- Ensure app_user record exists
    INSERT INTO app_user (id, email, created_at, updated_at)
    VALUES (v_uuid, '', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- ALSO insert into profiles table to satisfy foreign key constraints
    BEGIN
      INSERT INTO profiles (id, created_at, updated_at)
      VALUES (v_uuid, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist, that's OK
    END;
  END IF;

  RETURN v_uuid;
END;
$$;

-- Also backfill profiles for existing clerk_user_mapping records
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT supabase_user_id FROM clerk_user_mapping
  LOOP
    BEGIN
      INSERT INTO profiles (id, created_at, updated_at)
      VALUES (r.supabase_user_id, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist, that's OK
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert profile for UUID %: %', r.supabase_user_id, SQLERRM;
    END;
  END LOOP;
END $$;

SELECT '✅ Updated get_uuid_for_clerk_user to also insert into profiles table' as status;

