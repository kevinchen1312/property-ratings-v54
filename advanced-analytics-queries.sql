-- Advanced Analytics Queries for Rating Submission Tracking
-- These can be used to enhance the Analytics screen with more detailed insights

-- 1. Daily rating activity over the last 30 days
SELECT 
    DATE(created_at) as rating_date,
    COUNT(*) as daily_ratings,
    AVG(stars) as avg_stars_per_day
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY rating_date DESC;

-- 2. Hourly distribution of ratings (when do you rate most?)
SELECT 
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(*) as rating_count,
    ROUND(AVG(stars), 2) as avg_stars
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour_of_day;

-- 3. Top rated properties by you (your favorites)
SELECT 
    p.name as property_name,
    p.address as property_address,
    COUNT(r.id) as rating_count,
    ROUND(AVG(r.stars), 2) as avg_stars,
    MAX(r.created_at) as last_rated
FROM rating r
JOIN property p ON r.property_id = p.id
WHERE r.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
GROUP BY p.id, p.name, p.address
HAVING COUNT(r.id) >= 1
ORDER BY avg_stars DESC, rating_count DESC
LIMIT 10;

-- 4. Rating streaks (consecutive days with ratings)
WITH daily_ratings AS (
    SELECT DISTINCT DATE(created_at) as rating_date
    FROM rating 
    WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
    ORDER BY rating_date DESC
),
streaks AS (
    SELECT 
        rating_date,
        rating_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY rating_date DESC) as streak_group
    FROM daily_ratings
)
SELECT 
    MIN(rating_date) as streak_start,
    MAX(rating_date) as streak_end,
    COUNT(*) as streak_length
FROM streaks
GROUP BY streak_group
ORDER BY streak_length DESC
LIMIT 5;

-- 5. Rating comparison by attribute (which attributes do you rate highest/lowest?)
SELECT 
    attribute,
    COUNT(*) as total_ratings,
    ROUND(AVG(stars), 2) as avg_stars,
    MIN(stars) as min_stars,
    MAX(stars) as max_stars,
    MODE() WITHIN GROUP (ORDER BY stars) as most_common_rating
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
GROUP BY attribute
ORDER BY avg_stars DESC;

-- 6. Weekly rating summary (current week vs last week)
WITH week_stats AS (
    SELECT 
        CASE 
            WHEN created_at >= DATE_TRUNC('week', NOW()) THEN 'This Week'
            WHEN created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week' 
                 AND created_at < DATE_TRUNC('week', NOW()) THEN 'Last Week'
            ELSE 'Other'
        END as week_period,
        COUNT(*) as rating_count,
        ROUND(AVG(stars), 2) as avg_stars
    FROM rating 
    WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
        AND created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
    GROUP BY week_period
)
SELECT * FROM week_stats WHERE week_period != 'Other';

-- 7. Property diversity (how many unique properties have you rated?)
SELECT 
    COUNT(DISTINCT property_id) as unique_properties_rated,
    COUNT(*) as total_ratings,
    ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT property_id), 2) as avg_ratings_per_property
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- 8. Rating velocity (ratings per day over time)
SELECT 
    DATE(created_at) as rating_date,
    COUNT(*) as ratings_that_day,
    COUNT(*) OVER (
        ORDER BY DATE(created_at) 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) / 7.0 as seven_day_avg
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
GROUP BY DATE(created_at)
ORDER BY rating_date DESC
LIMIT 30;
