-- Update Milestone Achievements
-- Change Leadsong Legend to 5000 submissions with 49 credits
-- Update First 100 Leadsongs description

-- Update the available_achievements table
UPDATE public.available_achievements
SET 
    milestone_key = '5000_submissions',
    title = 'Leadsong Legend',
    description = 'Complete 5000 property ratings (5000 after your first 100)',
    reward_amount = 49,
    required_submissions = 5000
WHERE milestone_key = '5100_submissions';

-- Update the First 100 Leadsongs description
UPDATE public.available_achievements
SET 
    title = 'First 100 Leadsongs',
    description = 'Complete your first 100 submissions'
WHERE milestone_key = '100_submissions';

-- Verify the changes
SELECT 
    '✅ Updated achievements:' as status,
    milestone_key,
    title,
    description,
    reward_amount,
    required_submissions
FROM public.available_achievements
ORDER BY required_submissions;

-- Update the milestone progress function to use 5000 instead of 5100
CREATE OR REPLACE FUNCTION get_user_milestone_progress(p_user_id UUID)
RETURNS TABLE (
  total_submissions BIGINT,
  milestone_100_claimed BOOLEAN,
  milestone_5000_claimed BOOLEAN,
  progress_to_100 INTEGER,
  progress_to_5000 INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    -- Count UNIQUE submissions (button presses), not individual attribute ratings
    SELECT COUNT(DISTINCT (property_id, DATE_TRUNC('minute', created_at))) as submission_count
    FROM rating
    WHERE user_id = p_user_id
  ),
  rewards_claimed AS (
    SELECT 
      BOOL_OR(metadata->>'milestone' = '100_submissions') as claimed_100,
      BOOL_OR(metadata->>'milestone' = '5000_submissions') as claimed_5000
    FROM pending_rewards
    WHERE user_id = p_user_id
      AND reward_type = 'achievement'
  )
  SELECT 
    us.submission_count::BIGINT as total_submissions,
    COALESCE(rc.claimed_100, FALSE) as milestone_100_claimed,
    COALESCE(rc.claimed_5000, FALSE) as milestone_5000_claimed,
    LEAST(100, (us.submission_count * 100 / 100))::INTEGER as progress_to_100,
    LEAST(100, (us.submission_count * 100 / 5000))::INTEGER as progress_to_5000
  FROM user_stats us
  CROSS JOIN rewards_claimed rc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the milestone trigger function to use 5000 instead of 5100
CREATE OR REPLACE FUNCTION check_submission_milestones()
RETURNS TRIGGER AS $$
DECLARE
  total_submissions INTEGER;
  has_100_reward BOOLEAN;
  has_5000_reward BOOLEAN;
BEGIN
  -- Count UNIQUE submissions (button presses), not individual attribute ratings
  SELECT COUNT(DISTINCT (property_id, DATE_TRUNC('minute', created_at)))
  INTO total_submissions
  FROM rating
  WHERE user_id = NEW.user_id;
  
  -- Check if user has already received the 100 submission reward
  SELECT EXISTS(
    SELECT 1 FROM pending_rewards
    WHERE user_id = NEW.user_id
      AND reward_type = 'achievement'
      AND metadata->>'milestone' = '100_submissions'
  ) INTO has_100_reward;
  
  -- Check if user has already received the 5000 submission reward
  SELECT EXISTS(
    SELECT 1 FROM pending_rewards
    WHERE user_id = NEW.user_id
      AND reward_type = 'achievement'
      AND metadata->>'milestone' = '5000_submissions'
  ) INTO has_5000_reward;
  
  -- Award 100 submission milestone (1 credit)
  IF total_submissions = 100 AND NOT has_100_reward THEN
    INSERT INTO pending_rewards (
      user_id,
      reward_type,
      reward_amount,
      description,
      status,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'achievement',
      1,
      'First 100 Submissions Milestone! You''re making a real impact!',
      'pending',
      jsonb_build_object(
        'milestone', '100_submissions',
        'achieved_at', NOW(),
        'total_submissions', total_submissions
      ),
      NOW()
    );
    
    RAISE NOTICE 'User % reached 100 submissions! Reward created.', NEW.user_id;
  END IF;
  
  -- Award 5000 submission milestone (49 credits)
  IF total_submissions >= 5000 AND NOT has_5000_reward THEN
    INSERT INTO pending_rewards (
      user_id,
      reward_type,
      reward_amount,
      description,
      status,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'achievement',
      49,
      'LEGEND STATUS! 5000 Submissions! You''re a Leadsong hero!',
      'pending',
      jsonb_build_object(
        'milestone', '5000_submissions',
        'achieved_at', NOW(),
        'total_submissions', total_submissions
      ),
      NOW()
    );
    
    RAISE NOTICE 'User % reached 5000 submissions! 49 credit reward created.', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_milestone_progress(UUID) TO authenticated, anon;

SELECT '✅ All milestone achievements and functions updated!' as done;
SELECT '📝 Changes made:' as summary;
SELECT '   - Leadsong Legend: 5000 submissions, 49 credits' as change1;
SELECT '   - First 100 Leadsongs: Updated description' as change2;
SELECT '   - Functions updated to track 5000 instead of 5100' as change3;

