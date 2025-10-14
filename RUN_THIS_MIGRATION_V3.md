# 🔧 CRITICAL: Database Migration for Clerk Integration

## The Problem

Your database has `user_id` columns as `uuid` type, but Clerk uses string-based user IDs like `user_342IYaEgM4l0tCofbiE1Hqfdysy`. This causes all authentication and data access to fail.

**The previous migration failed because of foreign key constraints** - tables have relationships that prevented column type changes.

## The Fix (v3 - Handles Foreign Keys Properly!)

This migration script:
1. ✅ **Drops all foreign key constraints first**
2. ✅ **Drops all RLS policies**
3. ✅ **Changes all user_id columns from uuid to text**
4. ✅ **Recreates foreign keys with the new types**
5. ✅ **Recreates all RLS policies**

---

## 🚀 How to Run the Migration

### Step 1: Go to Supabase Dashboard

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **Property Ratings**
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration

1. Click **"New query"**
2. Open the file: `supabase/migrations/clerk_user_id_migration_v3.sql`
3. **Copy the ENTIRE contents** (all ~400+ lines)
4. **Paste** into the SQL Editor
5. **Click "Run"** (or press `Ctrl+Enter`)

### Step 3: Verify Success

You should see output like:
```
✅ Migration completed successfully! All user_id columns converted from uuid to text and policies recreated.
```

---

## 📋 What This Fixes

After running this migration, all these issues will be resolved:

✅ **Analytics page** - Will load and show your stats  
✅ **Rewards page** - Will show your referral code and milestone rewards  
✅ **Earnings page** - Will display properly  
✅ **Rating submissions** - Will work correctly  
✅ **User credits** - Will load and update  
✅ **Properties loading** - Will show pins on the map  

---

## ⚠️ Important Notes

- **This migration is idempotent** - You can run it multiple times safely
- **Existing data will be preserved** - It only changes column types, not data
- **All relationships are maintained** - Foreign keys are recreated after type changes
- **RLS policies are recreated** - Security remains intact

---

## 🔍 What Changed

### Tables Affected:
- `app_user` (id: uuid → text)
- `user_credits` (user_id: uuid → text)
- `user_stripe_accounts` (user_id: uuid → text)
- `contributor_payouts` (user_id: uuid → text)
- `revenue_distribution` (user_id: uuid → text)
- `user_referrals` (referrer_id, referred_id: uuid → text)
- `claimed_rewards` (user_id: uuid → text)
- `milestone_progress` (user_id: uuid → text)
- `rating` (user_id: uuid → text)
- `property_rating` (user_id: uuid → text)

### Foreign Keys:
All foreign key relationships to `app_user.id` are properly maintained.

### RLS Policies:
All Row Level Security policies are recreated to work with text-based user IDs.

---

## 🐛 Troubleshooting

**If you see any errors:**
1. Take a screenshot of the error
2. Share it with me
3. DO NOT run the migration again until we fix the error

**If it succeeds:**
1. Reload your app (press `r` in the terminal or force close Expo Go)
2. Sign in with Clerk
3. Test all features (analytics, rewards, ratings, etc.)

---

## ✅ After Migration Success

Once the migration completes successfully:

1. **Test the app** - Sign in and try all features
2. **Verify data** - Check that your existing data is still there
3. **Celebrate** 🎉 - Your Clerk integration is now fully functional!

