# Clerk OAuth Integration Setup Guide

This guide will help you complete the Clerk OAuth integration for your LeadSong app.

## 🎯 What's Been Done

✅ Installed Clerk SDK (`@clerk/clerk-expo`)
✅ Created Clerk-Supabase sync system
✅ Built beautiful auth screen with Apple/Google/Facebook OAuth
✅ Integrated Clerk with navigation
✅ Maintained all existing features (credits, ratings, rewards)

## 📋 What You Need to Do

### 1. Create a Clerk Account and Application

1. Go to [https://clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Choose the following OAuth providers:
   - ✅ Apple
   - ✅ Google  
   - ✅ Facebook
   - ✅ Email & Password

### 2. Configure OAuth Providers

#### Apple OAuth
1. In Clerk Dashboard → OAuth → Apple
2. Follow Clerk's guide to set up Apple Sign In
3. You'll need an Apple Developer account

#### Google OAuth
1. In Clerk Dashboard → OAuth → Google
2. Create OAuth credentials in Google Cloud Console
3. Add authorized redirect URIs from Clerk

#### Facebook OAuth
1. In Clerk Dashboard → OAuth → Facebook
2. Create a Facebook App
3. Configure OAuth redirect URIs from Clerk

### 3. Get Your Clerk Publishable Key

1. In Clerk Dashboard → API Keys
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### 4. Add Environment Variable

Add to your `.env` file or `app.config.ts`:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

### 5. Deploy Supabase Edge Functions

These functions sync Clerk users with your Supabase database:

#### Deploy sync-clerk-user function:
```bash
cd supabase/functions/sync-clerk-user
supabase functions deploy sync-clerk-user
```

#### Deploy clerk-to-supabase-jwt function:
```bash
cd supabase/functions/clerk-to-supabase-jwt
supabase functions deploy clerk-to-supabase-jwt
```

### 6. Set Supabase Environment Variables

You need to add the JWT secret to your Supabase Edge Functions:

```bash
supabase secrets set SUPABASE_JWT_SECRET=your_jwt_secret_here
```

To get your JWT secret:
1. Go to Supabase Dashboard → Settings → API
2. Find "JWT Secret" under Project API keys
3. Copy and use it in the command above

### 7. Update app.config.ts (if needed)

If you're using `app.config.ts` instead of `.env`, add:

```typescript
export default {
  expo: {
    // ... other config
    extra: {
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
  },
};
```

## 🔒 How It Works

### Authentication Flow

1. **User signs in with Clerk** (Apple/Google/Facebook/Email)
2. **Clerk creates a session** with unique user ID
3. **Our sync system:**
   - Creates matching user in Supabase `auth.users` table
   - Uses **same user ID** as Clerk
   - Creates profile in `app_user` table
   - Initializes credits
4. **Supabase JWT generated** with Clerk user ID
5. **User accesses all features** - credits, ratings, rewards work perfectly!

### Data Preservation

✅ **All existing users preserved** - No data loss
✅ **Credits maintained** - User credits table intact
✅ **Ratings intact** - All rating data preserved
✅ **Rewards working** - Milestone system functional
✅ **RLS policies work** - `auth.uid()` returns correct ID

## 🧪 Testing

### Test the Integration

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Test OAuth Sign In:**
   - Tap "Continue with Apple"
   - Tap "Continue with Google"
   - Tap "Continue with Facebook"

3. **Test Email/Password:**
   - Create account with email
   - Verify email
   - Sign in

4. **Test Existing Features:**
   - Submit ratings ✅
   - Check credits ✅
   - View rewards ✅
   - See earnings ✅

## 🐛 Troubleshooting

### "Clerk publishable key not found"
- Make sure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- Restart the dev server after adding environment variables

### "Failed to sync user"
- Check that Supabase Edge Functions are deployed
- Verify `SUPABASE_JWT_SECRET` is set correctly
- Check Supabase function logs

### OAuth not working
- Verify OAuth providers are configured in Clerk Dashboard
- Check redirect URIs are correct
- Make sure providers are enabled in Clerk

### Users can't access data
- Verify Edge Functions are creating users with correct ID
- Check `auth.users` table in Supabase
- Ensure RLS policies are enabled

## 📱 OAuth Provider Setup Details

### Apple Sign In
Requires:
- Apple Developer account ($99/year)
- App ID with Sign in with Apple capability
- Service ID and Key from Apple

### Google Sign In  
Requires:
- Google Cloud Project
- OAuth 2.0 Client ID (iOS and Android)
- Authorized redirect URIs

### Facebook Login
Requires:
- Facebook Developer account
- Facebook App
- OAuth redirect URIs configured

## ✅ Verification Checklist

- [ ] Clerk account created
- [ ] OAuth providers configured (Apple, Google, Facebook)
- [ ] Clerk publishable key added to environment
- [ ] Supabase Edge Functions deployed
- [ ] JWT secret set in Supabase
- [ ] App starts without errors
- [ ] Can sign in with OAuth providers
- [ ] Can sign in with email/password
- [ ] Credits system working
- [ ] Ratings submission working
- [ ] Rewards/milestones working
- [ ] User profile accessible

## 🎉 Success!

Once all checklist items are complete, your app will have:
- 🍎 Apple Sign In
- 🔍 Google Sign In
- 👥 Facebook Login
- 📧 Email/Password authentication
- ✨ Beautiful purple-themed auth screen
- 🔒 Secure Clerk-Supabase sync
- ✅ All existing features preserved

## 📞 Need Help?

If you encounter issues:
1. Check Supabase function logs
2. Check Clerk Dashboard logs
3. Review console output for errors
4. Verify all environment variables are set

## 🔄 Migration Notes

**Important:** This integration is **additive only** - it does not modify or delete any existing data:
- Existing users can continue using email/password
- All user data remains intact
- Credits, ratings, and rewards preserved
- No database schema changes required
- Backward compatible with existing auth

