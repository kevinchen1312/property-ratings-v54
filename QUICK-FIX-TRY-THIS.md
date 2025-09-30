# Quick Troubleshooting Steps

## The permission error persists even after all database fixes. Let's try these:

### 1. **Check Console Logs** (Most Important!)
Look at your app's console/debugger output when you submit a rating.
You should see these log messages:
```
🔍 Starting rating submission...
✅ User authenticated: [user_id]
📝 Attempting to insert ratings: [array]
📊 Insert result: { data, error }
```

**CRITICAL: What does the error object show?**
- `error.code`: ?
- `error.message`: ?
- `error.details`: ?

### 2. **Sign Out and Back In**
Your auth token might be stale:
1. Sign out of the app completely
2. Close the app
3. Reopen and sign back in
4. Try rating again

### 3. **Check if it's actually reaching the database**
Run this in Supabase SQL Editor:
```sql
-- Check if your user can be found
SELECT id, email FROM app_user WHERE email = 'YOUR_EMAIL_HERE';

-- Try to manually insert a rating for that user
INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng)
SELECT 
  (SELECT id FROM app_user LIMIT 1),
  (SELECT id FROM property LIMIT 1),
  'noise',
  4,
  37.3,
  -122.0;
  
-- If that works, delete it
DELETE FROM rating WHERE stars = 4 AND attribute = 'noise' AND user_lat = 37.3;
```

### 4. **Verify RLS is actually disabled**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rating';
```
Should show: `rowsecurity = false`

### 5. **Nuclear option if nothing else works**
Drop and recreate the trigger:
```sql
DROP TRIGGER IF EXISTS trigger_update_contributor_stats ON rating;
```

Then try rating again.

