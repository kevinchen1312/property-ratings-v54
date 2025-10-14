-- Migration: Convert user_id columns from uuid to text for Clerk integration
-- This script automatically discovers and drops ALL RLS policies before changing column types

-- =====================================================
-- STEP 1: Drop ALL policies on affected tables
-- =====================================================

-- Drop all policies on user_credits table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_credits'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_credits', r.policyname);
        RAISE NOTICE 'Dropped policy: % on user_credits', r.policyname;
    END LOOP;
END $$;

-- Drop all policies on app_user table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'app_user'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON app_user', r.policyname);
        RAISE NOTICE 'Dropped policy: % on app_user', r.policyname;
    END LOOP;
END $$;

-- Drop all policies on user_stripe_accounts table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'user_stripe_accounts'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON user_stripe_accounts', r.policyname);
            RAISE NOTICE 'Dropped policy: % on user_stripe_accounts', r.policyname;
        END LOOP;
    END IF;
END $$;

-- Drop all policies on contributor_payouts table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'contributor_payouts'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON contributor_payouts', r.policyname);
            RAISE NOTICE 'Dropped policy: % on contributor_payouts', r.policyname;
        END LOOP;
    END IF;
END $$;

-- Drop all policies on revenue_distribution table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'revenue_distribution'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON revenue_distribution', r.policyname);
            RAISE NOTICE 'Dropped policy: % on revenue_distribution', r.policyname;
        END LOOP;
    END IF;
END $$;

-- Drop all policies on user_analytics table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'user_analytics'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON user_analytics', r.policyname);
            RAISE NOTICE 'Dropped policy: % on user_analytics', r.policyname;
        END LOOP;
    END IF;
END $$;

-- Drop all policies on rewards table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'rewards'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON rewards', r.policyname);
            RAISE NOTICE 'Dropped policy: % on rewards', r.policyname;
        END LOOP;
    END IF;
END $$;

-- Drop all policies on milestone_progress table (if exists)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
        FOR r IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'milestone_progress'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON milestone_progress', r.policyname);
            RAISE NOTICE 'Dropped policy: % on milestone_progress', r.policyname;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Alter column types from uuid to text
-- =====================================================

-- 1. user_credits table
DO $$ 
BEGIN
  ALTER TABLE user_credits ALTER COLUMN user_id TYPE text USING user_id::text;
  RAISE NOTICE 'Converted user_credits.user_id to text';
END $$;

-- 2. app_user table
DO $$ 
BEGIN
  ALTER TABLE app_user ALTER COLUMN id TYPE text USING id::text;
  RAISE NOTICE 'Converted app_user.id to text';
END $$;

-- 3. user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    ALTER TABLE user_stripe_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted user_stripe_accounts.user_id to text';
  END IF;
END $$;

-- 4. contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    ALTER TABLE contributor_payouts ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted contributor_payouts.user_id to text';
  END IF;
END $$;

-- 5. revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    ALTER TABLE revenue_distribution ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted revenue_distribution.user_id to text';
  END IF;
END $$;

-- 6. user_analytics table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    ALTER TABLE user_analytics ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted user_analytics.user_id to text';
  END IF;
END $$;

-- 7. rewards table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
    ALTER TABLE rewards ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted rewards.user_id to text';
  END IF;
END $$;

-- 8. milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    ALTER TABLE milestone_progress ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted milestone_progress.user_id to text';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Recreate RLS policies with text-based user_id
-- =====================================================

-- Recreate policies on user_credits table
DO $$
BEGIN
  CREATE POLICY "Users can view their own credits" ON user_credits
    FOR SELECT USING (user_id = auth.uid()::text);

  CREATE POLICY "Users can insert their own credits" ON user_credits
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

  CREATE POLICY "Users can update their own credits" ON user_credits
    FOR UPDATE USING (user_id = auth.uid()::text);

  RAISE NOTICE 'Recreated policies on user_credits';
END $$;

-- Recreate policies on app_user table
DO $$
BEGIN
  CREATE POLICY "Users can view their own profile" ON app_user
    FOR SELECT USING (id = auth.uid()::text);

  CREATE POLICY "Users can insert their own profile" ON app_user
    FOR INSERT WITH CHECK (id = auth.uid()::text);

  CREATE POLICY "Users can update their own profile" ON app_user
    FOR UPDATE USING (id = auth.uid()::text);

  RAISE NOTICE 'Recreated policies on app_user';
END $$;

-- Recreate policies on user_stripe_accounts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stripe_accounts') THEN
    EXECUTE 'CREATE POLICY "Users can view their own Stripe account" ON user_stripe_accounts
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can insert their own Stripe account" ON user_stripe_accounts
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can update their own Stripe account" ON user_stripe_accounts
      FOR UPDATE USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on user_stripe_accounts';
  END IF;
END $$;

-- Recreate policies on contributor_payouts table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributor_payouts') THEN
    EXECUTE 'CREATE POLICY "Users can view their own payouts" ON contributor_payouts
      FOR SELECT USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on contributor_payouts';
  END IF;
END $$;

-- Recreate policies on revenue_distribution table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_distribution') THEN
    EXECUTE 'CREATE POLICY "Users can view their own revenue" ON revenue_distribution
      FOR SELECT USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on revenue_distribution';
  END IF;
END $$;

-- Recreate policies on user_analytics table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    EXECUTE 'CREATE POLICY "Users can view their own analytics" ON user_analytics
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can insert their own analytics" ON user_analytics
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can update their own analytics" ON user_analytics
      FOR UPDATE USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on user_analytics';
  END IF;
END $$;

-- Recreate policies on rewards table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
    EXECUTE 'CREATE POLICY "Users can view their own rewards" ON rewards
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can insert their own rewards" ON rewards
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can update their own rewards" ON rewards
      FOR UPDATE USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on rewards';
  END IF;
END $$;

-- Recreate policies on milestone_progress table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestone_progress') THEN
    EXECUTE 'CREATE POLICY "Users can view their own milestone progress" ON milestone_progress
      FOR SELECT USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can insert their own milestone progress" ON milestone_progress
      FOR INSERT WITH CHECK (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Users can update their own milestone progress" ON milestone_progress
      FOR UPDATE USING (user_id = auth.uid()::text)';
    RAISE NOTICE 'Recreated policies on milestone_progress';
  END IF;
END $$;

-- Done!
SELECT '✅ Migration completed successfully! All user_id columns converted from uuid to text and policies recreated.' AS status;

