-- Migration: Convert user_id columns from uuid to text for Clerk integration
-- This script properly handles foreign keys, RLS policies, and column type changes
-- v4: Fixed to only target public schema tables (not system tables)

-- =====================================================
-- STEP 1: Drop ALL foreign key constraints (PUBLIC SCHEMA ONLY)
-- =====================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'  -- ONLY public schema!
        AND (
            tc.table_name IN ('user_credits', 'user_stripe_accounts', 'contributor_payouts', 
                             'revenue_distribution', 'user_referrals', 'claimed_rewards', 
                             'milestone_progress', 'rating', 'property_rating')
            OR tc.constraint_name LIKE '%user_id%'
            OR tc.constraint_name LIKE '%app_user%'
        )
    ) LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped foreign key: % on %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Drop ALL RLS policies on affected tables
-- =====================================================

-- Drop all policies on user_credits
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'user_credits'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_credits', r.policyname);
        RAISE NOTICE 'Dropped policy: % on user_credits', r.policyname;
    END LOOP;
END $$;

-- Drop all policies on app_user
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'app_user'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON app_user', r.policyname);
        RAISE NOTICE 'Dropped policy: % on app_user', r.policyname;
    END LOOP;
END $$;

-- Drop all policies on other affected tables
DO $$ 
DECLARE
    r RECORD;
    t TEXT;
BEGIN
    FOR t IN (
        SELECT unnest(ARRAY['user_stripe_accounts', 'contributor_payouts', 'revenue_distribution', 
                           'user_referrals', 'claimed_rewards', 'milestone_progress', 'rating', 'property_rating'])
    ) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            FOR r IN (
                SELECT policyname 
                FROM pg_policies 
                WHERE schemaname = 'public'
                AND tablename = t
            ) LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, t);
                RAISE NOTICE 'Dropped policy: % on %', r.policyname, t;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Alter column types from uuid to text
-- =====================================================

-- 1. app_user.id (primary table)
DO $$ 
BEGIN
  ALTER TABLE app_user ALTER COLUMN id TYPE text USING id::text;
  RAISE NOTICE 'Converted app_user.id to text';
END $$;

-- 2. user_credits.user_id (foreign key to app_user.id)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_credits' AND column_name = 'user_id') THEN
    ALTER TABLE user_credits ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted user_credits.user_id to text';
  END IF;
END $$;

-- 3. user_stripe_accounts.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_stripe_accounts' AND column_name = 'user_id') THEN
    ALTER TABLE user_stripe_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted user_stripe_accounts.user_id to text';
  END IF;
END $$;

-- 4. contributor_payouts.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contributor_payouts' AND column_name = 'user_id') THEN
    ALTER TABLE contributor_payouts ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted contributor_payouts.user_id to text';
  END IF;
END $$;

-- 5. revenue_distribution.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revenue_distribution' AND column_name = 'user_id') THEN
    ALTER TABLE revenue_distribution ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted revenue_distribution.user_id to text';
  END IF;
END $$;

-- 6. user_referrals.referrer_id and referred_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_referrals' AND column_name = 'referrer_id') THEN
    ALTER TABLE user_referrals ALTER COLUMN referrer_id TYPE text USING referrer_id::text;
    RAISE NOTICE 'Converted user_referrals.referrer_id to text';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_referrals' AND column_name = 'referred_id') THEN
    ALTER TABLE user_referrals ALTER COLUMN referred_id TYPE text USING referred_id::text;
    RAISE NOTICE 'Converted user_referrals.referred_id to text';
  END IF;
END $$;

-- 7. claimed_rewards.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'claimed_rewards' AND column_name = 'user_id') THEN
    ALTER TABLE claimed_rewards ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted claimed_rewards.user_id to text';
  END IF;
END $$;

-- 8. milestone_progress.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'milestone_progress' AND column_name = 'user_id') THEN
    ALTER TABLE milestone_progress ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted milestone_progress.user_id to text';
  END IF;
END $$;

-- 9. rating.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rating' AND column_name = 'user_id') THEN
    ALTER TABLE rating ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted rating.user_id to text';
  END IF;
END $$;

-- 10. property_rating.user_id (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_rating' AND column_name = 'user_id') THEN
    ALTER TABLE property_rating ALTER COLUMN user_id TYPE text USING user_id::text;
    RAISE NOTICE 'Converted property_rating.user_id to text';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Recreate foreign key constraints
-- =====================================================

-- user_credits.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_credits') THEN
    ALTER TABLE user_credits 
      ADD CONSTRAINT user_credits_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: user_credits.user_id -> app_user.id';
  END IF;
END $$;

-- user_stripe_accounts.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_stripe_accounts') THEN
    ALTER TABLE user_stripe_accounts 
      ADD CONSTRAINT user_stripe_accounts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: user_stripe_accounts.user_id -> app_user.id';
  END IF;
END $$;

-- contributor_payouts.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributor_payouts') THEN
    ALTER TABLE contributor_payouts 
      ADD CONSTRAINT contributor_payouts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: contributor_payouts.user_id -> app_user.id';
  END IF;
END $$;

-- revenue_distribution.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revenue_distribution') THEN
    ALTER TABLE revenue_distribution 
      ADD CONSTRAINT revenue_distribution_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: revenue_distribution.user_id -> app_user.id';
  END IF;
END $$;

-- user_referrals foreign keys
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_referrals') THEN
    ALTER TABLE user_referrals 
      ADD CONSTRAINT user_referrals_referrer_id_fkey 
      FOREIGN KEY (referrer_id) REFERENCES app_user(id) ON DELETE CASCADE;
    ALTER TABLE user_referrals 
      ADD CONSTRAINT user_referrals_referred_id_fkey 
      FOREIGN KEY (referred_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign keys for user_referrals';
  END IF;
END $$;

-- claimed_rewards.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'claimed_rewards') THEN
    ALTER TABLE claimed_rewards 
      ADD CONSTRAINT claimed_rewards_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: claimed_rewards.user_id -> app_user.id';
  END IF;
END $$;

-- milestone_progress.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestone_progress') THEN
    ALTER TABLE milestone_progress 
      ADD CONSTRAINT milestone_progress_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    RAISE NOTICE 'Recreated foreign key: milestone_progress.user_id -> app_user.id';
  END IF;
END $$;

-- rating.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rating') THEN
    ALTER TABLE rating 
      ADD CONSTRAINT rating_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL;
    RAISE NOTICE 'Recreated foreign key: rating.user_id -> app_user.id';
  END IF;
END $$;

-- property_rating.user_id -> app_user.id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_rating') THEN
    ALTER TABLE property_rating 
      ADD CONSTRAINT property_rating_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL;
    RAISE NOTICE 'Recreated foreign key: property_rating.user_id -> app_user.id';
  END IF;
END $$;

-- =====================================================
-- STEP 5: Recreate RLS policies
-- =====================================================

-- Recreate policies on user_credits
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

-- Recreate policies on app_user
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

-- Recreate policies on user_stripe_accounts
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_stripe_accounts') THEN
    CREATE POLICY "Users can view their own Stripe account" ON user_stripe_accounts
      FOR SELECT USING (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can insert their own Stripe account" ON user_stripe_accounts
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can update their own Stripe account" ON user_stripe_accounts
      FOR UPDATE USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on user_stripe_accounts';
  END IF;
END $$;

-- Recreate policies on contributor_payouts
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributor_payouts') THEN
    CREATE POLICY "Users can view their own payouts" ON contributor_payouts
      FOR SELECT USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on contributor_payouts';
  END IF;
END $$;

-- Recreate policies on revenue_distribution
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revenue_distribution') THEN
    CREATE POLICY "Users can view their own revenue" ON revenue_distribution
      FOR SELECT USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on revenue_distribution';
  END IF;
END $$;

-- Recreate policies on user_referrals
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_referrals') THEN
    CREATE POLICY "Users can view their own referrals" ON user_referrals
      FOR SELECT USING (referrer_id = auth.uid()::text OR referred_id = auth.uid()::text);
    
    CREATE POLICY "Users can insert their own referrals" ON user_referrals
      FOR INSERT WITH CHECK (referred_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on user_referrals';
  END IF;
END $$;

-- Recreate policies on claimed_rewards
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'claimed_rewards') THEN
    CREATE POLICY "Users can view their own claimed rewards" ON claimed_rewards
      FOR SELECT USING (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can insert their own claimed rewards" ON claimed_rewards
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on claimed_rewards';
  END IF;
END $$;

-- Recreate policies on milestone_progress
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestone_progress') THEN
    CREATE POLICY "Users can view their own milestone progress" ON milestone_progress
      FOR SELECT USING (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can insert their own milestone progress" ON milestone_progress
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can update their own milestone progress" ON milestone_progress
      FOR UPDATE USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on milestone_progress';
  END IF;
END $$;

-- Recreate policies on rating
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rating') THEN
    CREATE POLICY "Users can view all ratings" ON rating
      FOR SELECT USING (true);
    
    CREATE POLICY "Users can insert their own ratings" ON rating
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can update their own ratings" ON rating
      FOR UPDATE USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on rating';
  END IF;
END $$;

-- Recreate policies on property_rating
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_rating') THEN
    CREATE POLICY "Users can view all property ratings" ON property_rating
      FOR SELECT USING (true);
    
    CREATE POLICY "Users can insert their own property ratings" ON property_rating
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);
    
    CREATE POLICY "Users can update their own property ratings" ON property_rating
      FOR UPDATE USING (user_id = auth.uid()::text);
    
    RAISE NOTICE 'Recreated policies on property_rating';
  END IF;
END $$;

-- Done!
SELECT '✅ Migration completed successfully! All user_id columns converted from uuid to text and policies recreated.' as status;

