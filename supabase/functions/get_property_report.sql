-- Property Report Generation Function
-- This function generates comprehensive property reports with ratings data

CREATE OR REPLACE FUNCTION get_property_report(
  p_property_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  overall_avg NUMERIC;
  noise_avg NUMERIC;
  safety_avg NUMERIC;
  cleanliness_avg NUMERIC;
  weekly_data JSON;
  monthly_data JSON;
  log_data JSON;
BEGIN
  -- Calculate overall average
  SELECT AVG(stars) INTO overall_avg
  FROM rating 
  WHERE property_id = p_property_id 
    AND created_at::date BETWEEN p_from AND p_to;

  -- Calculate averages by attribute
  SELECT AVG(stars) INTO noise_avg
  FROM rating 
  WHERE property_id = p_property_id 
    AND attribute = 'noise'
    AND created_at::date BETWEEN p_from AND p_to;

  SELECT AVG(stars) INTO safety_avg
  FROM rating 
  WHERE property_id = p_property_id 
    AND attribute = 'safety'
    AND created_at::date BETWEEN p_from AND p_to;

  SELECT AVG(stars) INTO cleanliness_avg
  FROM rating 
  WHERE property_id = p_property_id 
    AND attribute = 'cleanliness'
    AND created_at::date BETWEEN p_from AND p_to;

  -- Get weekly data
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'week_start', week_start::text,
      'avg_stars', ROUND(avg_stars, 2)
    ) ORDER BY week_start
  ) INTO weekly_data
  FROM (
    SELECT 
      DATE_TRUNC('week', created_at)::date as week_start,
      AVG(stars) as avg_stars
    FROM rating 
    WHERE property_id = p_property_id 
      AND created_at::date BETWEEN p_from AND p_to
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start
  ) weekly;

  -- Get monthly data
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'month_start', month_start::text,
      'avg_stars', ROUND(avg_stars, 2)
    ) ORDER BY month_start
  ) INTO monthly_data
  FROM (
    SELECT 
      DATE_TRUNC('month', created_at)::date as month_start,
      AVG(stars) as avg_stars
    FROM rating 
    WHERE property_id = p_property_id 
      AND created_at::date BETWEEN p_from AND p_to
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start
  ) monthly;

  -- Get recent log entries (last 50)
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'date', created_at::date::text,
      'attribute', attribute,
      'stars', stars
    ) ORDER BY created_at DESC
  ) INTO log_data
  FROM (
    SELECT created_at, attribute, stars
    FROM rating 
    WHERE property_id = p_property_id 
      AND created_at::date BETWEEN p_from AND p_to
    ORDER BY created_at DESC
    LIMIT 50
  ) log;

  -- Build final result
  result := JSON_BUILD_OBJECT(
    'overall', JSON_BUILD_OBJECT(
      'avg_all', CASE WHEN overall_avg IS NOT NULL THEN ROUND(overall_avg, 2) ELSE NULL END
    ),
    'avg_by_attribute', JSON_BUILD_OBJECT(
      'noise', CASE WHEN noise_avg IS NOT NULL THEN ROUND(noise_avg, 2) ELSE NULL END,
      'safety', CASE WHEN safety_avg IS NOT NULL THEN ROUND(safety_avg, 2) ELSE NULL END,
      'cleanliness', CASE WHEN cleanliness_avg IS NOT NULL THEN ROUND(cleanliness_avg, 2) ELSE NULL END
    ),
    'weekly', COALESCE(weekly_data, '[]'::json),
    'monthly', COALESCE(monthly_data, '[]'::json),
    'log', COALESCE(log_data, '[]'::json)
  );

  RETURN result;
END;
$$;
