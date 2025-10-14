# 🔧 CRITICAL: Run This Database Migration

## The Problem
Your database tables have `user_id` columns defined as `uuid` type, but Clerk uses string-based user IDs like `user_342IYaEgM4l0tCofbiE1Hqfdysy`.

This is causing all the errors you're seeing:
- ❌ Analytics not loading
- ❌ Rewards screen broken
- ❌ Earnings not working
- ❌ Credits not loading

## The Fix

You need to run the migration SQL to convert `user_id` columns from `uuid` to `text` type.

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Click "New query"
   - Copy the ENTIRE contents of `supabase/migrations/clerk_user_id_migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - This means the migration ran successfully

5. **Restart Your App**
   - Force close Expo Go
   - Reopen and sign in with Google
   - All features should now work! ✅

## What This Does

The migration converts all `user_id` columns in these tables from `uuid` to `text`:
- ✅ `user_credits`
- ✅ `user_stripe_accounts`
- ✅ `contributor_payouts`
- ✅ `revenue_distribution`
- ✅ `user_referrals`
- ✅ `milestone_progress`
- ✅ `reward_claims`
- ✅ `property_contributors`
- ✅ Any analytics tables

This allows Clerk's string-based user IDs to be stored and queried correctly.

## After Running the Migration

Once you run this, test:
- ✅ Analytics page
- ✅ Rewards page (should show referral code + milestones)
- ✅ Earnings page
- ✅ Submit a rating
- ✅ Credits loading

Everything should work!

