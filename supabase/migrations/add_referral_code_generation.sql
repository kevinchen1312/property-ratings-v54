-- Add referral code generation for Clerk users
-- This fixes the issue where Clerk users don't get referral codes

-- Function to generate a unique referral code (similar to the Edge Function)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 12-character uppercase code
    v_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::text || clock_timestamp()::text) FROM 1 FOR 12));
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
    
    -- If it doesn't exist, we can use it
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Update get_uuid_for_clerk_user to generate referral codes
CREATE OR REPLACE FUNCTION get_uuid_for_clerk_user(p_clerk_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uuid UUID;
  v_referral_code TEXT;
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
    
    -- Generate a unique referral code
    v_referral_code := generate_referral_code();
    
    -- Insert into profiles table with referral code
    BEGIN
      INSERT INTO profiles (id, referral_code, created_at, updated_at)
      VALUES (v_uuid, v_referral_code, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
        updated_at = NOW();
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist, that's OK
    END;
  ELSE
    -- User already exists, but might not have a referral code
    -- Check if profile exists and add referral code if missing
    BEGIN
      -- Try to get existing referral code
      SELECT referral_code INTO v_referral_code
      FROM profiles
      WHERE id = v_uuid;
      
      -- If no referral code exists, generate and update
      IF v_referral_code IS NULL THEN
        v_referral_code := generate_referral_code();
        UPDATE profiles 
        SET referral_code = v_referral_code, updated_at = NOW()
        WHERE id = v_uuid;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist, that's OK
      WHEN no_data_found THEN
        -- Profile doesn't exist, create it with referral code
        v_referral_code := generate_referral_code();
        INSERT INTO profiles (id, referral_code, created_at, updated_at)
        VALUES (v_uuid, v_referral_code, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END;
  END IF;

  RETURN v_uuid;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated, anon, service_role;

SELECT '✅ Updated get_uuid_for_clerk_user to generate referral codes' as status;

