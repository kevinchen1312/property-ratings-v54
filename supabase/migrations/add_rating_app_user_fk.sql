-- Add foreign key relationship between rating.user_id and app_user.id
-- This is required for PostgREST to perform joins (leaderboard query)

-- First, check if the foreign key already exists
DO $$
BEGIN
  -- Check if the constraint exists
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
    
    RAISE NOTICE 'âœ… Added foreign key constraint: rating.user_id -> app_user.id';
  ELSE
    RAISE NOTICE 'âœ"ï¸ Foreign key constraint already exists';
  END IF;
END $$;

SELECT '✅ Rating-AppUser foreign key relationship established' as status;

