# 🔧 Clerk Integration Troubleshooting

## ✅ Fixed Issues

### Issue 1: "You're already signed in"
**Problem:** Clerk session persisting from previous attempts  
**Fix:** Auth screen now auto-clears Clerk session on mount  
**Status:** ✅ Fixed

### Issue 2: "Edge Function returned non-2xx status"
**Problem:** Sync function trying to create users in auth.users with custom IDs (not supported)  
**Fix:** Simplified sync to only use app_user table and JWT tokens  
**Status:** ✅ Fixed

## 🚀 How to Test Now

### Step 1: Reload the App
Press **R** in the terminal or shake your device to reload

### Step 2: Sign In Fresh
Try one of these methods:
- ✅ Email/Password (should work immediately)
- ✅ Google OAuth (after configuring in Clerk Dashboard)
- ✅ Apple OAuth (after configuring in Clerk Dashboard)
- ✅ Facebook OAuth (after configuring in Clerk Dashboard)

### Step 3: Verify Features Work
After signing in, test:
- [ ] View credits
- [ ] Submit a rating
- [ ] Check rewards
- [ ] View profile

## 🎯 What Changed

### Auth Screen
- Auto-clears any existing Clerk session
- Better error handling
- Shows proper loading states

### Sync Functions
- **sync-clerk-user**: Now upserts to app_user table instead of auth.users
- **clerk-to-supabase-jwt**: Generates JWT with Clerk ID as subject
- Both functions have better error logging

### How It Works Now
```
1. User signs in with Clerk
   ↓
2. Clerk creates session
   ↓
3. sync-clerk-user creates/updates app_user record
   ↓
4. clerk-to-supabase-jwt generates JWT token
   ↓
5. JWT has Clerk user ID as 'sub' claim
   ↓
6. RLS policies use auth.uid() = Clerk user ID
   ↓
7. All features work! ✅
```

## 🐛 If You Still See Errors

### "Session already exists"
**Solution:** Close and reopen the app completely

### "Failed to sync user"
**Solution:**
1. Check Supabase Dashboard → Edge Functions → Logs
2. Look for errors in sync-clerk-user function
3. Verify JWT_SECRET is set: `supabase secrets list`

### "Can't access data"
**Solution:**
1. Verify JWT token is being generated
2. Check RLS policies allow `auth.uid()`
3. Verify user ID matches between Clerk and Supabase

## 📱 OAuth Provider Setup

### Not Configured Yet?
The OAuth buttons will show errors until you configure them in Clerk Dashboard:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **OAuth** in sidebar
4. Configure providers:
   - **Apple**: Needs Apple Developer account ($99/year)
   - **Google**: Free, 5 minutes setup
   - **Facebook**: Free, 5 minutes setup

### Email/Password Works Immediately!
You don't need to configure OAuth to test. Email/password auth works right away.

## ✅ Success Criteria

Your integration is working when:
1. ✅ Can sign in without "already signed in" error
2. ✅ No "Edge Function" errors in console
3. ✅ Credits display correctly
4. ✅ Can submit ratings
5. ✅ Rewards/milestones work
6. ✅ Profile displays

## 🔍 Debug Commands

### Check if JWT secret is set:
```bash
supabase secrets list
```

### View function deployments:
```bash
supabase functions list
```

### Test sync function manually:
```bash
curl -X POST https://oyphcjbickujybvbeame.supabase.co/functions/v1/sync-clerk-user \
  -H "Content-Type: application/json" \
  -d '{"clerk_user_id":"test_123","email":"test@example.com","first_name":"Test","last_name":"User"}'
```

## 📞 Next Steps

1. **Reload the app** (press R or shake device)
2. **Try signing in** with email/password
3. **Test all features** to confirm they work
4. **Configure OAuth** in Clerk Dashboard when ready

Everything should work now! 🎉

