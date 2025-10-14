-- Update referral code generation to be 8 characters and exclude confusing characters
-- Excludes: 0 (zero), O (letter O), 1 (one), L (letter L)

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- Excludes 0, O, 1, L, I
  v_length INTEGER := 8;
  v_char_count INTEGER;
  v_random_index INTEGER;
BEGIN
  v_char_count := LENGTH(v_chars);
  
  LOOP
    v_code := '';
    
    -- Generate 8 random characters from the safe character set
    FOR i IN 1..v_length LOOP
      v_random_index := 1 + FLOOR(RANDOM() * v_char_count);
      v_code := v_code || SUBSTRING(v_chars FROM v_random_index FOR 1);
    END LOOP;
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
    
    -- If it doesn't exist, we can use it
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated, anon, service_role;

SELECT '✅ Updated referral code format: 8 characters, no confusing characters' as status;

