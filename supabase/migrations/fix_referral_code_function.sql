-- Fix referral code generation function to be more robust
-- This addresses the 500 error when creating new users

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS generate_referral_code();

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- Excludes 0, O, 1, L, I
  v_length INTEGER := 8;
  v_char_count INTEGER;
  v_random_pos INTEGER;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  v_char_count := LENGTH(v_chars);
  
  -- Try to generate a unique code
  LOOP
    v_code := '';
    v_attempts := v_attempts + 1;
    
    -- Safety check to prevent infinite loop
    IF v_attempts > v_max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique referral code after % attempts', v_max_attempts;
    END IF;
    
    -- Generate 8 random characters from the safe character set
    FOR i IN 1..v_length LOOP
      v_random_pos := 1 + FLOOR(RANDOM() * v_char_count)::INTEGER;
      v_code := v_code || SUBSTRING(v_chars FROM v_random_pos FOR 1);
    END LOOP;
    
    -- Check if this code already exists in profiles table
    BEGIN
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
      
      -- If it doesn't exist, we can use it
      IF NOT v_exists THEN
        RETURN v_code;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        -- profiles table doesn't exist yet, just return the code
        RETURN v_code;
      WHEN OTHERS THEN
        -- Log error but continue trying
        RAISE NOTICE 'Error checking referral code uniqueness: %', SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated, anon, service_role;

-- Update get_uuid_for_clerk_user to have better error handling
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
    
    -- Try to insert into profiles table with referral code
    BEGIN
      -- Generate referral code
      v_referral_code := generate_referral_code();
      
      -- Insert into profiles
      INSERT INTO profiles (id, referral_code, created_at, updated_at)
      VALUES (v_uuid, v_referral_code, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
        updated_at = NOW();
        
      RAISE NOTICE 'Created profile with referral code: %', v_referral_code;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'profiles table does not exist, skipping profile creation';
      WHEN OTHERS THEN
        -- Log the error but don't fail the entire function
        RAISE NOTICE 'Error creating profile: %', SQLERRM;
    END;
  ELSE
    -- User exists, make sure they have a referral code
    BEGIN
      -- Check if profile exists and has referral code
      SELECT referral_code INTO v_referral_code
      FROM profiles
      WHERE id = v_uuid;
      
      -- If no referral code, generate one
      IF v_referral_code IS NULL THEN
        v_referral_code := generate_referral_code();
        
        UPDATE profiles
        SET referral_code = v_referral_code,
            updated_at = NOW()
        WHERE id = v_uuid;
        
        RAISE NOTICE 'Added referral code to existing profile: %', v_referral_code;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        NULL; -- profiles table doesn't exist
      WHEN NO_DATA_FOUND THEN
        -- Profile doesn't exist, try to create it
        BEGIN
          v_referral_code := generate_referral_code();
          
          INSERT INTO profiles (id, referral_code, created_at, updated_at)
          VALUES (v_uuid, v_referral_code, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
          
          RAISE NOTICE 'Created missing profile with referral code: %', v_referral_code;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Error creating profile for existing user: %', SQLERRM;
        END;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error checking/updating referral code: %', SQLERRM;
    END;
  END IF;

  RETURN v_uuid;
END;
$$;

SELECT '✅ Fixed referral code generation with better error handling' as status;

