-- Update Contributor Ranking System
-- This adds a new function to get top 3 contributors (gold, silver, bronze) instead of just top 1

-- Drop existing function
DROP FUNCTION IF EXISTS get_top_contributor(UUID);

-- Create new function to get top 3 contributors
CREATE OR REPLACE FUNCTION get_top_contributors(property_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  rating_count BIGINT,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_contributors AS (
    SELECT 
      r.user_id,
      COUNT(*) as rating_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
    FROM rating r
    WHERE r.property_id = property_uuid
      AND r.created_at >= NOW() - INTERVAL '1 year'
      AND r.user_id IS NOT NULL
    GROUP BY r.user_id
  )
  SELECT 
    rc.user_id,
    rc.rating_count,
    rc.rank::INTEGER
  FROM ranked_contributors rc
  WHERE rc.rank <= 3
  ORDER BY rc.rank;
END;
$$ LANGUAGE plpgsql;

-- Keep the old function for backward compatibility (returns only top contributor)
CREATE OR REPLACE FUNCTION get_top_contributor(property_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    COUNT(*) as rating_count
  FROM rating r
  WHERE r.property_id = property_uuid
    AND r.created_at >= NOW() - INTERVAL '1 year'
    AND r.user_id IS NOT NULL
  GROUP BY r.user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate credits required based on submission count
CREATE OR REPLACE FUNCTION calculate_credits_required(property_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  submission_count INTEGER;
BEGIN
  -- Count total ratings for this property
  SELECT COUNT(*) INTO submission_count
  FROM rating
  WHERE property_id = property_uuid;
  
  -- Calculate credits based on submission count
  IF submission_count < 100 THEN
    RETURN 1;  -- $5
  ELSIF submission_count < 1000 THEN
    RETURN 2;  -- $10
  ELSE
    RETURN 4;  -- $20
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT 'Contributor ranking system updated successfully!' as result;
