-- Fix duplicate email error in get_uuid_for_clerk_user function
-- The issue: Empty string '' for email violates unique constraint when multiple users try to sign up
-- The solution: Use a unique placeholder email based on Clerk user ID

CREATE OR REPLACE FUNCTION get_uuid_for_clerk_user(p_clerk_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uuid UUID;
  v_placeholder_email TEXT;
BEGIN
  -- Try to get existing mapping
  SELECT supabase_user_id INTO v_uuid
  FROM clerk_user_mapping
  WHERE clerk_user_id = p_clerk_user_id;

  -- If not found, create new mapping with a generated UUID
  IF v_uuid IS NULL THEN
    v_uuid := gen_random_uuid();
    
    -- Create a unique placeholder email for this Clerk user
    -- Format: clerk+{clerk_user_id}@placeholder.local
    v_placeholder_email := 'clerk+' || p_clerk_user_id || '@placeholder.local';
    
    -- Insert the mapping
    INSERT INTO clerk_user_mapping (clerk_user_id, supabase_user_id)
    VALUES (p_clerk_user_id, v_uuid)
    ON CONFLICT (clerk_user_id) DO NOTHING;
    
    -- Ensure app_user record exists with this UUID and unique placeholder email
    INSERT INTO app_user (id, email, created_at, updated_at)
    VALUES (v_uuid, v_placeholder_email, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();  -- Update email if record exists
    
    -- ALSO insert into profiles table to satisfy foreign key constraints
    BEGIN
      -- Generate a referral code for this new user
      INSERT INTO profiles (id, referral_code, created_at, updated_at)
      VALUES (v_uuid, generate_referral_code(), NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist, that's OK
      WHEN undefined_function THEN
        -- generate_referral_code doesn't exist, insert without it
        INSERT INTO profiles (id, created_at, updated_at)
        VALUES (v_uuid, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert profile for UUID %: %', v_uuid, SQLERRM;
    END;
  END IF;

  RETURN v_uuid;
END;
$$;

SELECT '✅ Fixed get_uuid_for_clerk_user to use unique placeholder emails' as status;

