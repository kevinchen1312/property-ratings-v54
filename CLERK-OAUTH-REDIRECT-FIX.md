# 🔧 Fix OAuth Redirect URLs

## The Problem

Your OAuth buttons are failing with:
```
The current redirect url passed in the sign in or sign up request does not match 
an authorized redirect URI for this instance.
exp://192.168.12.238:8083/--/oauth-native-callback
```

## ✅ Quick Fix

You need to add the redirect URL to your Clerk Dashboard.

### Step 1: Go to Clerk Dashboard
1. Visit [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **OAuth** in the left sidebar

### Step 2: Add Redirect URLs

For each OAuth provider (Google, Apple, Facebook), add these redirect URLs:

**Development URLs:**
```
exp://192.168.12.238:8083/--/oauth-native-callback
exp://192.168.12.238:8085/--/oauth-native-callback
exp://localhost:8083/--/oauth-native-callback
exp://localhost:8085/--/oauth-native-callback
```

**Production URLs:**
```
leadsong://oauth-native-callback
property-ratings://oauth-native-callback
```

### Step 3: Enable OAuth Providers

Make sure each provider is **enabled** in Clerk:

#### Google OAuth
1. Go to Clerk Dashboard → **OAuth** → **Google**
2. Click **Enable**
3. Add redirect URLs above
4. Save

#### Facebook OAuth
1. Go to Clerk Dashboard → **OAuth** → **Facebook**
2. Click **Enable**
3. Add redirect URLs above
4. Save

#### Apple OAuth
1. Go to Clerk Dashboard → **OAuth** → **Apple**
2. Click **Enable**
3. Add redirect URLs above
4. Requires Apple Developer account setup
5. Save

## 🎯 Alternative: Use Email/Password First

Email/password auth should work without OAuth configuration. Try:

1. **Sign Up** with a new email
2. **Verify your email** (check your inbox)
3. **Sign in** with verified email

## ⚠️ Current Status

Based on your errors:

- ❌ **Google OAuth**: Redirect URL not configured
- ❌ **Facebook OAuth**: Redirect URL not configured  
- ❌ **Apple OAuth**: Redirect URL not configured
- ⚠️ **Email/Password**: Account needs verification

## 🚀 Quick Test

### Option 1: Configure OAuth (10 minutes)
1. Add redirect URLs to Clerk Dashboard
2. Enable OAuth providers
3. Test OAuth buttons

### Option 2: Use Email/Password (2 minutes)
1. Sign up with new email
2. Verify email
3. Sign in

## 📱 After Configuration

Once you add the redirect URLs and reload the app:
- ✅ Google OAuth will work
- ✅ Facebook OAuth will work
- ✅ Apple OAuth will work
- ✅ Email/Password will work

## 🔍 Verify Configuration

In Clerk Dashboard, check:
- [ ] OAuth providers are **enabled**
- [ ] Redirect URLs are added
- [ ] URLs include your current port (8083 or 8085)
- [ ] Development mode is active

Then reload your app and try again!

