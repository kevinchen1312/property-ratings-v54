-- Update Rating Limits from Daily to Hourly
-- This removes the daily unique constraint and lets the application handle hourly rate limiting
-- Run this in your Supabase SQL Editor

-- Drop the daily unique constraint index
DROP INDEX IF EXISTS idx_rating_unique_daily;

-- Drop any daily rating prevention triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_daily_ratings ON rating;
DROP FUNCTION IF EXISTS prevent_duplicate_daily_ratings();

-- Note: Hourly rate limiting is now handled by the application logic in checkHourlyRateLimit()
-- This allows for more flexible rate limiting and better user experience

-- Confirm the update
SELECT 'Daily rating constraints removed. Hourly rate limiting now handled by application.' as status;
