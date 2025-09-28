-- Remove daily rating limit for testing
-- This allows multiple ratings per day for the same property

-- Drop the unique constraint that prevents multiple ratings per day
DROP INDEX IF EXISTS idx_rating_unique_daily;

-- Drop the trigger that enforces daily limits (if it exists)
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_daily_ratings ON rating;

-- Drop the function that prevents duplicate daily ratings (if it exists)  
DROP FUNCTION IF EXISTS prevent_duplicate_daily_ratings();

-- Add a comment to track this change
COMMENT ON TABLE rating IS 'Daily rating limits removed for testing - users can now rate properties multiple times per day';
