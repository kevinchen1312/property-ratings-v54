-- Switch from daily to hourly rating limits
-- Remove daily constraints and keep only hourly logic in the app

-- Drop the daily unique constraint
DROP INDEX IF EXISTS idx_rating_unique_daily;

-- Drop any daily rating triggers and functions
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_daily_ratings ON rating;
DROP FUNCTION IF EXISTS prevent_duplicate_daily_ratings();

-- The hourly rate limiting will be handled by the app logic
-- Users can rate once per hour per property (any attribute)

-- Add a comment to track this change
COMMENT ON TABLE rating IS 'Switched to hourly rating limits (handled in app) - users can rate once per hour per property';
