-- Migration: Convert user_id columns from uuid to text for Clerk integration
-- This script safely handles RLS policies that depend on user_id columns

-- Step 1: Drop RLS policies that reference user_id columns
-- We'll recreate them after the column type change

-- Drop policies on user_credits table
DROP POLICY IF EXISTS user_credits_select_own ON user_credits;
DROP POLICY IF EXISTS user_credits_insert_own ON user_credits;
DROP POLICY IF EXISTS user_credits_update_own ON user_credits;
DROP POLICY IF EXISTS user_credits_delete_own ON user_credits;

-- Drop policies on app_user table
DROP POLICY IF EXISTS app_user_select_own ON app_user;
DROP POLICY IF EXISTS app_user_insert_own ON app_user;
DROP POLICY IF EXISTS app_user_update_own ON app_user;
DROP POLICY IF EXISTS app_user_delete_own ON app_user;

-- Drop policies on user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    DROP POLICY IF EXISTS user_stripe_accounts_select_own ON user_stripe_accounts;
    DROP POLICY IF EXISTS user_stripe_accounts_insert_own ON user_stripe_accounts;
    DROP POLICY IF EXISTS user_stripe_accounts_update_own ON user_stripe_accounts;
  END IF;
END $$;

-- Drop policies on contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    DROP POLICY IF EXISTS contributor_payouts_select_own ON contributor_payouts;
    DROP POLICY IF EXISTS contributor_payouts_insert_own ON contributor_payouts;
    DROP POLICY IF EXISTS contributor_payouts_update_own ON contributor_payouts;
  END IF;
END $$;

-- Drop policies on revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    DROP POLICY IF EXISTS revenue_distribution_select_own ON revenue_distribution;
  END IF;
END $$;

-- Drop policies on user_analytics table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    DROP POLICY IF EXISTS user_analytics_select_own ON user_analytics;
    DROP POLICY IF EXISTS user_analytics_insert_own ON user_analytics;
    DROP POLICY IF EXISTS user_analytics_update_own ON user_analytics;
  END IF;
END $$;

-- Drop policies on rewards table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
    DROP POLICY IF EXISTS rewards_select_own ON rewards;
    DROP POLICY IF EXISTS rewards_insert_own ON rewards;
    DROP POLICY IF EXISTS rewards_update_own ON rewards;
  END IF;
END $$;

-- Drop policies on milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    DROP POLICY IF EXISTS milestone_progress_select_own ON milestone_progress;
    DROP POLICY IF EXISTS milestone_progress_insert_own ON milestone_progress;
    DROP POLICY IF EXISTS milestone_progress_update_own ON milestone_progress;
  END IF;
END $$;

-- Step 2: Alter column types from uuid to text

-- 1. user_credits table
ALTER TABLE user_credits ALTER COLUMN user_id TYPE text USING user_id::text;

-- 2. app_user table
ALTER TABLE app_user ALTER COLUMN id TYPE text USING id::text;

-- 3. user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    ALTER TABLE user_stripe_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 4. contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    ALTER TABLE contributor_payouts ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 5. revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    ALTER TABLE revenue_distribution ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 6. user_analytics table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    ALTER TABLE user_analytics ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 7. rewards table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
    ALTER TABLE rewards ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- 8. milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    ALTER TABLE milestone_progress ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- Step 3: Recreate RLS policies with text-based user_id

-- Recreate policies on user_credits table
CREATE POLICY user_credits_select_own ON user_credits
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY user_credits_insert_own ON user_credits
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY user_credits_update_own ON user_credits
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Recreate policies on app_user table
CREATE POLICY app_user_select_own ON app_user
  FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY app_user_insert_own ON app_user
  FOR INSERT WITH CHECK (id = auth.uid()::text);

CREATE POLICY app_user_update_own ON app_user
  FOR UPDATE USING (id = auth.uid()::text);

-- Recreate policies on user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    EXECUTE 'CREATE POLICY user_stripe_accounts_select_own ON user_stripe_accounts
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY user_stripe_accounts_insert_own ON user_stripe_accounts
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY user_stripe_accounts_update_own ON user_stripe_accounts
      FOR UPDATE USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Recreate policies on contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    EXECUTE 'CREATE POLICY contributor_payouts_select_own ON contributor_payouts
      FOR SELECT USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Recreate policies on revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    EXECUTE 'CREATE POLICY revenue_distribution_select_own ON revenue_distribution
      FOR SELECT USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Recreate policies on user_analytics table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    EXECUTE 'CREATE POLICY user_analytics_select_own ON user_analytics
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY user_analytics_insert_own ON user_analytics
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY user_analytics_update_own ON user_analytics
      FOR UPDATE USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Recreate policies on rewards table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
    EXECUTE 'CREATE POLICY rewards_select_own ON rewards
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY rewards_insert_own ON rewards
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY rewards_update_own ON rewards
      FOR UPDATE USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Recreate policies on milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    EXECUTE 'CREATE POLICY milestone_progress_select_own ON milestone_progress
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY milestone_progress_insert_own ON milestone_progress
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY milestone_progress_update_own ON milestone_progress
      FOR UPDATE USING (user_id = auth.uid()::text)';
  END IF;
END $$;

-- Done!
SELECT 'Migration completed successfully! All user_id columns converted from uuid to text.' AS status;

