-- Fix orphaned ratings and add foreign key constraint for leaderboard
-- This script:
-- 1. Creates placeholder app_user entries for orphaned ratings
-- 2. Creates placeholder profiles entries for those users
-- 3. Adds the foreign key constraint

-- Step 1: Find and fix orphaned ratings by creating app_user entries for them
INSERT INTO app_user (id, email, full_name, created_at, updated_at)
SELECT DISTINCT 
  r.user_id,
  'orphaned+' || r.user_id || '@placeholder.local' AS email,
  'Legacy User' AS full_name,
  NOW() AS created_at,
  NOW() AS updated_at
FROM rating r
LEFT JOIN app_user au ON r.user_id = au.id
WHERE au.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 2: Also create profiles entries for these orphaned users
-- (Required for leaderboard to show names and for other features)
DO $$
DECLARE
  orphaned_user RECORD;
BEGIN
  FOR orphaned_user IN (
    SELECT DISTINCT r.user_id
    FROM rating r
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE p.id IS NULL
  )
  LOOP
    BEGIN
      INSERT INTO profiles (id, referral_code, created_at, updated_at)
      VALUES (
        orphaned_user.user_id,
        generate_referral_code(),  -- Generate a referral code
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN undefined_function THEN
        -- generate_referral_code doesn't exist, insert without it
        INSERT INTO profiles (id, created_at, updated_at)
        VALUES (orphaned_user.user_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert profile for user %: %', orphaned_user.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Now add the foreign key constraint (should succeed now)
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'rating_user_id_app_user_fkey' 
    AND table_name = 'rating'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE rating
    ADD CONSTRAINT rating_user_id_app_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES app_user(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key constraint: rating.user_id -> app_user.id';
  ELSE
    RAISE NOTICE '✓ Foreign key constraint already exists';
  END IF;
END $$;

SELECT '✅ Fixed orphaned ratings and established Rating-AppUser foreign key relationship' as status;

