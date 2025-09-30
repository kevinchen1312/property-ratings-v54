-- Fix the foreign key mismatch in property_contributors
-- The table currently references auth.users but should reference app_user

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE property_contributors 
DROP CONSTRAINT IF EXISTS property_contributors_user_id_fkey;

-- Step 2: Delete any orphaned records (users not in app_user)
DELETE FROM property_contributors pc
WHERE NOT EXISTS (
  SELECT 1 FROM app_user au WHERE au.id = pc.user_id
);

-- Step 3: Add the correct foreign key pointing to app_user
ALTER TABLE property_contributors
ADD CONSTRAINT property_contributors_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

-- Step 4: Do the same for contributor_payouts if it exists
ALTER TABLE contributor_payouts 
DROP CONSTRAINT IF EXISTS contributor_payouts_user_id_fkey;

DELETE FROM contributor_payouts cp
WHERE NOT EXISTS (
  SELECT 1 FROM app_user au WHERE au.id = cp.user_id
);

ALTER TABLE contributor_payouts
ADD CONSTRAINT contributor_payouts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

-- Step 5: Do the same for revenue_distribution.top_contributor_id if it exists
ALTER TABLE revenue_distribution 
DROP CONSTRAINT IF EXISTS revenue_distribution_top_contributor_id_fkey;

ALTER TABLE revenue_distribution
ADD CONSTRAINT revenue_distribution_top_contributor_id_fkey
FOREIGN KEY (top_contributor_id) REFERENCES app_user(id) ON DELETE SET NULL;

-- Verify the fix
SELECT 
  'Foreign keys fixed!' as status,
  'property_contributors, contributor_payouts, and revenue_distribution now reference app_user' as details;

