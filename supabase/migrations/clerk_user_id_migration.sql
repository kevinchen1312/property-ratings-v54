-- Migration: Convert user_id columns from uuid to text for Clerk integration
-- This allows Clerk user IDs (e.g., "user_342IYaEgM4l0tCofbiE1Hqfdysy") to be stored

-- 1. Update user_credits table
ALTER TABLE user_credits ALTER COLUMN user_id TYPE text USING user_id::text;

-- 2. Update user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    ALTER TABLE user_stripe_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 3. Update contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    ALTER TABLE contributor_payouts ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 4. Update revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    ALTER TABLE revenue_distribution ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 5. Update user_referrals table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_referrals') THEN
    ALTER TABLE user_referrals ALTER COLUMN referrer_id TYPE text USING referrer_id::text;
    ALTER TABLE user_referrals ALTER COLUMN referred_id TYPE text USING referred_id::text;
  END IF;
END $$;

-- 6. Update milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    ALTER TABLE milestone_progress ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 7. Update reward_claims table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reward_claims') THEN
    ALTER TABLE reward_claims ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 8. Update property_contributors table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_contributors') THEN
    ALTER TABLE property_contributors ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 9. Update app_user table if user_id column exists there
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'app_user' AND column_name = 'user_id') THEN
    ALTER TABLE app_user ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 10. Update any analytics-related tables
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    ALTER TABLE user_analytics ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

