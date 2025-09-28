-- Update existing friendliness ratings to safety in the database
-- Run this in your Supabase SQL Editor

-- Update existing ratings
UPDATE rating 
SET attribute = 'safety' 
WHERE attribute = 'friendliness';

-- Update any check constraints (if they exist)
-- Note: This assumes you have a check constraint on the attribute column
-- If you don't have one, this will fail gracefully

-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'rating_attribute_check' 
        AND table_name = 'rating'
    ) THEN
        ALTER TABLE rating DROP CONSTRAINT rating_attribute_check;
    END IF;
END $$;

-- Add new constraint with safety instead of friendliness
ALTER TABLE rating 
ADD CONSTRAINT rating_attribute_check 
CHECK (attribute IN ('noise', 'safety', 'cleanliness'));

-- Verify the update
SELECT 
    attribute, 
    COUNT(*) as count 
FROM rating 
GROUP BY attribute 
ORDER BY attribute;
