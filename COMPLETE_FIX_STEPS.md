# 🔧 Complete Fix for Clerk Integration

## 🎯 Summary of Issues:

1. **Stuck on Login** ✅ **FIXED** - Added "Clear Session" button
2. **UUID Errors** ⚠️ **NEEDS SQL MIGRATION** - RPC function not inserting into `profiles` table

---

## 📋 **Step-by-Step Fix (Do in Order):**

### **Step 1: Clear Your Stuck Session** ✅

1. **Stop Expo** (Ctrl+C in terminal)
2. **Restart Expo**:
   ```powershell
   npx expo start --clear --port 8081
   ```
3. **Open the app** - you should see a **yellow warning banner** with "Clear Session" button
4. **Click "Clear Session"**
5. **You should now be able to sign in** (but you'll still see UUID errors - that's Step 2)

---

### **Step 2: Fix UUID Mapping** 🔧

After you successfully sign in (from Step 1), you'll see errors like:
```
ERROR Get credits error: "invalid input syntax for type uuid: \"user_342...\""
```

This is because the RPC function needs to be updated. Here's how:

#### **2a. Run SQL Migration**

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/sql/new
   
2. **Copy ALL contents** from: `supabase/migrations/add_profiles_insert.sql`

3. **Paste and click "Run"**

This migration will:
- ✅ Update the `get_uuid_for_clerk_user()` function to insert into BOTH `app_user` AND `profiles` tables
- ✅ Backfill `profiles` records for existing Clerk users
- ✅ Fix the foreign key constraint error

#### **2b. Test the RPC Function**

After running the migration, test it with this SQL query:
```sql
SELECT get_uuid_for_clerk_user('user_test_123');
```

You should get a UUID back like: `d0a25789-37c7-4816-9b5a-0e7f9305da76`

---

### **Step 3: Sign Out and Sign Back In** 🔄

1. **Open the app**
2. **Go to Settings** (in the map screen)
3. **Click "Sign Out"**
4. **Sign in again** with Google/Apple/Facebook
5. **Check the logs** - you should see:
   ```
   ✅ UUID mapping: { clerk_user_id: 'user_342...', user_uuid: '76e72b07-...' }
   ✅ Supabase JWT token generated for Clerk user
   ✅ Supabase session established with UUID: 76e72b07-...
   ```

---

### **Step 4: Test All Features** ✅

After signing back in, test:
- ✅ **Analytics page** - should open without "not authenticated" error
- ✅ **Rewards page** - should show referral code and milestones
- ✅ **Earnings page** - should load without UUID errors
- ✅ **Submit a rating** - should work without "property not found" error
- ✅ **Credits** - should show your credit balance

---

## 🔍 **What Each Step Does:**

### Step 1 (Clear Session):
- Clears Clerk's stuck session from SecureStore
- Allows you to sign in fresh
- Prevents "already signed in" errors

### Step 2 (SQL Migration):
- Updates the UUID mapping function to also insert into `profiles` table
- Fixes foreign key constraint errors when submitting ratings
- Ensures all database relationships work properly

### Step 3 (Re-sign In):
- Generates a new UUID mapping for your Clerk user
- Creates a JWT token with the UUID (not the Clerk string ID)
- Establishes proper Supabase session

---

## 📊 **Expected Terminal Logs (After All Fixes):**

**Good:**
```
LOG  👤 Clerk user signed in, syncing to Supabase... user_342IYaEgM4l0tCofbiE1Hqfdysy
LOG  🔄 Syncing Clerk user to Supabase: user_342IYaEgM4l0tCofbiE1Hqfdysy kevinchen1312@gmail.com
LOG  ✅ User synced successfully: {
  "success": true,
  "user_id": "user_342IYaEgM4l0tCofbiE1Hqfdysy",
  "user_uuid": "76e72b07-a2ec-4e78-8adf-e3014daf2bd5"  ← THIS IS KEY!
}
LOG  ✅ Supabase JWT token generated for Clerk user
LOG  ✅ Supabase session established with UUID: 76e72b07-a2ec-4e78-8adf-e3014daf2bd5
LOG  Getting credits for user: 76e72b07-a2ec-4e78-8adf-e3014daf2bd5  ← SHOULD BE UUID!
LOG  User credits: 95
```

**Bad (Before Fix):**
```
LOG  ✅ User synced successfully: {
  "success": true,
  "user_id": "user_342IYaEgM4l0tCofbiE1Hqfdysy"
  ← MISSING: "user_uuid"
}
LOG  Getting credits for user: user_342IYaEgM4l0tCofbiE1Hqfdysy  ← WRONG! Should be UUID
ERROR Get credits error: "invalid input syntax for type uuid..."
```

---

## 🆘 **Troubleshooting:**

### "Clear Session button doesn't appear"
**Solution**: The app detects you're signed in. Try:
- Force close the app completely
- Restart Expo with `--clear` flag
- Reinstall the app on your device

### "SQL migration says relation already exists"
**Solution**: That's OK! It means the table already exists. The function will still be updated. Just make sure you see:
```
✅ Updated get_uuid_for_clerk_user to also insert into profiles table
```

### "Still getting UUID errors after migration"
**Solution**: 
1. Make sure you ran the migration successfully
2. **Sign out and sign back in** (Step 3) to get a fresh UUID mapping
3. Check the terminal logs to confirm `user_uuid` is in the sync response

---

## ✅ **Ready to Start?**

1. ✅ Restart Expo: `npx expo start --clear --port 8081`
2. ✅ Click "Clear Session" button in the app
3. ✅ Run the SQL migration: `add_profiles_insert.sql`
4. ✅ Sign out and sign back in
5. ✅ Test all features

Let me know what happens at each step! 🚀

