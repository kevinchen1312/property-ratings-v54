# Clerk OAuth Redirect URL Fix

## The Issue
Your app is using the scheme `property-ratings` (defined in `app.config.ts`), but Clerk is trying to redirect to the development exp:// URLs which are dynamic and change based on your IP/port.

## The Solution

### 1. Add the Correct Redirect URL to Clerk Dashboard

Go to your Clerk Dashboard → Configure → Native applications → **Redirect URLs** section:

**Add this URL:**
```
property-ratings://oauth-native-callback
```

This is your app's custom scheme + the OAuth callback path.

### 2. Already Fixed in Code
✅ I've updated `ClerkAuthScreen.tsx` to explicitly use this redirect URL
✅ Better error messages for OAuth and email/password issues

## About the Email/Password Error

The error "The verification strategy is not valid for this account" happens because:

1. **Your account was created with Google OAuth** (kevinchen1312@gmail.com via Google)
2. **OAuth accounts don't have passwords** - they use the OAuth provider for authentication
3. **You can't sign in with email/password** for an OAuth-created account

### To Test Email/Password Sign-In:
- Use a **different email address** (not kevinchen1312@gmail.com)
- Click "Sign Up" and create a new account with email/password
- That new account can then sign in with email/password

## What's Changed in the Code

1. **OAuth redirect URL**: Now explicitly set to `property-ratings://oauth-native-callback`
2. **Better error handling**: Shows helpful messages for common auth errors
3. **OAuth errors**: Now explains redirect URL configuration issues

## Testing Checklist

1. ✅ Add `property-ratings://oauth-native-callback` to Clerk Dashboard
2. ✅ Restart your app (press `r` in Expo terminal)
3. ✅ Try signing in with Google/Apple/Facebook (should work now!)
4. ✅ Try signing in with email/password using **a different email** (should fail for OAuth accounts with helpful message)
5. ✅ Create a new account with email/password using a **different email**
6. ✅ Sign in with that new email/password account

## Clerk Dashboard Navigation

**Configure** → **Native applications** → Scroll to **Redirect URLs** → Click **Add** → Type `property-ratings://oauth-native-callback` → Click **Add** button

