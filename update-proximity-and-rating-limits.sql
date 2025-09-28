-- Combined Update: Proximity to 200m and Rating Limits to Hourly
-- This script updates both proximity validation and rating limits
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- PART 1: Update Proximity Validation from 2000m to 200m
-- ============================================================================

-- Drop the existing proximity validation trigger and function
DROP TRIGGER IF EXISTS trigger_validate_rating_proximity ON rating;
DROP FUNCTION IF EXISTS validate_rating_proximity();

-- Create updated function to validate user proximity (within 200m)
CREATE OR REPLACE FUNCTION validate_rating_proximity()
RETURNS TRIGGER AS $$
DECLARE
    property_geom GEOGRAPHY;
    user_geom GEOGRAPHY;
    distance_meters DOUBLE PRECISION;
BEGIN
    -- Get property location
    SELECT geom INTO property_geom 
    FROM property 
    WHERE id = NEW.property_id;
    
    -- If property not found, let the foreign key constraint handle it
    IF property_geom IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Create user location point
    user_geom := ST_Point(NEW.user_lng, NEW.user_lat)::geography;
    
    -- Calculate distance in meters
    distance_meters := ST_Distance(property_geom, user_geom);
    
    -- Check if user is within 200 meters
    IF distance_meters > 200 THEN
        RAISE EXCEPTION 'User must be within 200 meters of the property to submit a rating. Current distance: % meters', ROUND(distance_meters);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate proximity on rating insert
CREATE TRIGGER trigger_validate_rating_proximity
    BEFORE INSERT ON rating
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating_proximity();

-- ============================================================================
-- PART 2: Update Rating Limits from Daily to Hourly (Application-Managed)
-- ============================================================================

-- Drop the daily unique constraint index
DROP INDEX IF EXISTS idx_rating_unique_daily;

-- Drop any daily rating prevention triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_daily_ratings ON rating;
DROP FUNCTION IF EXISTS prevent_duplicate_daily_ratings();

-- Note: Hourly rate limiting is now handled by the application logic in checkHourlyRateLimit()
-- This allows for more flexible rate limiting and better user experience

-- ============================================================================
-- CONFIRMATION
-- ============================================================================

SELECT 'Successfully updated: Proximity validation to 200m, Rating limits to hourly (app-managed)' as status;
