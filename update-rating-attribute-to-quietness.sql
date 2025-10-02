-- Migration: Update rating_attribute enum from 'noise' to 'quietness'
-- This updates the database to match the new rating criteria
-- IMPORTANT: Run each section separately (copy/paste one at a time)

-- ========================================
-- SECTION 1: Add 'quietness' to enum
-- Run this first, then wait a moment
-- ========================================
ALTER TYPE rating_attribute ADD VALUE IF NOT EXISTS 'quietness';

-- ========================================
-- SECTION 2: Update existing records
-- Run this second (after Section 1 completes)
-- ========================================
-- Find and disable all triggers on rating table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'rating'::regclass 
        AND NOT tgisinternal
    LOOP
        EXECUTE 'ALTER TABLE rating DISABLE TRIGGER ' || quote_ident(r.tgname);
    END LOOP;
END $$;

-- Update records
UPDATE rating 
SET attribute = 'quietness' 
WHERE attribute = 'noise';

-- Re-enable all triggers
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'rating'::regclass 
        AND NOT tgisinternal
    LOOP
        EXECUTE 'ALTER TABLE rating ENABLE TRIGGER ' || quote_ident(r.tgname);
    END LOOP;
END $$;

-- ========================================
-- SECTION 3: Clean up enum
-- Run this third (after Section 2 completes)
-- ========================================
-- Drop dependent view
DROP VIEW IF EXISTS property_ratings_summary;

-- Create new enum with correct order
CREATE TYPE rating_attribute_new AS ENUM ('safety', 'quietness', 'cleanliness');

-- Update table to use new enum
ALTER TABLE rating 
    ALTER COLUMN attribute TYPE rating_attribute_new 
    USING attribute::text::rating_attribute_new;

-- Clean up
DROP TYPE rating_attribute;
ALTER TYPE rating_attribute_new RENAME TO rating_attribute;

-- Recreate the view (if it existed)
CREATE OR REPLACE VIEW property_ratings_summary AS
SELECT 
    property_id,
    attribute,
    AVG(stars) as avg_rating,
    COUNT(*) as rating_count
FROM rating
GROUP BY property_id, attribute;

-- Verify
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rating_attribute')
ORDER BY enumsortorder;

SELECT '✅ Successfully updated rating_attribute enum from noise to quietness!' as result;

