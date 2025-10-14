# 🚀 Clerk Production Key Setup

## ✅ Yes, Use Your Production Key!

You can (and should) use your **production Clerk key** (`pk_live_...`) instead of test keys.

## 📝 Add Your Production Key

Create or update your `.env` file in the project root:

```bash
# Clerk Production Key
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_actual_production_key_here

# Your existing Supabase keys remain the same
EXPO_PUBLIC_SUPABASE_URL=https://oyphcjbickujybvbeame.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc
```

## 🔑 Get Your Production Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys**
4. Copy your **Production Publishable Key** (starts with `pk_live_`)

## 🔄 Production vs Test Keys

### Production Key (`pk_live_...`)
- ✅ Use for your live app
- ✅ Real users sign in here
- ✅ Production OAuth apps connected
- ✅ Real email delivery
- ⚠️ Be careful with changes

### Test Key (`pk_test_...`)
- 🧪 Use for development/testing
- 🧪 Separate user database
- 🧪 Test OAuth apps
- 🧪 Safe to experiment

## ⚡ Quick Setup Steps

### 1. Add Production Key to `.env`
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
```

### 2. Configure Production OAuth

In Clerk Dashboard (Production Mode):

**Apple Sign In:**
- Use your production Apple App ID
- Production Service ID
- Production certificate

**Google Sign In:**
- Production OAuth Client IDs
- Add production redirect URIs
- Enable for iOS and Android

**Facebook Login:**
- Production Facebook App ID
- Production OAuth settings
- Add production redirect URIs

### 3. Update Redirect URIs

For production, add these to your OAuth apps:

**Development:**
- `exp://localhost:8083`
- `exp://192.168.12.238:8083`

**Production:**
- `leadsong://` (your app scheme)
- Any custom domains

### 4. Deploy Supabase Functions

Make sure your Supabase functions are deployed to production:

```bash
supabase functions deploy sync-clerk-user
supabase functions deploy clerk-to-supabase-jwt
```

### 5. Set Production JWT Secret

```bash
supabase secrets set SUPABASE_JWT_SECRET=your_production_jwt_secret
```

Get from: **Supabase Dashboard → Settings → API → JWT Secret** (make sure you're in production project)

### 6. Restart Your App

```bash
# Stop current server (Ctrl+C)
npm start
```

## ✅ Verification

After setup, test:
- [ ] App starts without errors
- [ ] Can sign in with email/password
- [ ] OAuth buttons work (after provider configuration)
- [ ] User data syncs correctly
- [ ] Credits work
- [ ] Ratings work

## 🎯 Best Practices

### During Development
- Use **test key** for development
- Separate test users from production
- Test OAuth flows before production

### For Production
- Use **production key** always
- Monitor Clerk Dashboard logs
- Check Supabase function logs
- Keep JWT secret secure

## 🔐 Security Notes

### Environment Variables
- ✅ `.env` file is in `.gitignore` (safe)
- ⚠️ Never commit production keys to git
- ✅ Publishable keys are safe in client code
- ⚠️ Secret keys stay on server only

### Keys to Keep Secret
- 🔒 Clerk Secret Key (never in client)
- 🔒 Supabase Service Role Key (server only)
- 🔒 JWT Secret (Supabase functions only)

### Keys Safe in Client
- ✅ Clerk Publishable Key (pk_live_...)
- ✅ Supabase Anon Key

## 🚀 Production Checklist

Before going live:
- [ ] Production Clerk key added to `.env`
- [ ] OAuth providers configured in production
- [ ] Redirect URIs updated for production
- [ ] Supabase functions deployed
- [ ] JWT secret set (production)
- [ ] Test complete sign-in flow
- [ ] Verify user data syncs
- [ ] Test all critical features

## 📱 OAuth Provider Production Setup

### Apple Sign In (Production)
1. Apple Developer → Certificates, IDs & Profiles
2. App ID → Enable Sign in with Apple
3. Create Service ID (production)
4. Create Key for Sign in with Apple
5. Add to Clerk production settings

### Google Sign In (Production)
1. Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID (iOS)
3. Create OAuth 2.0 Client ID (Android)
4. Add authorized redirect URIs
5. Add to Clerk production settings

### Facebook Login (Production)
1. Facebook Developers → Your App
2. Switch to Live Mode
3. Configure OAuth Redirect URIs
4. Submit for App Review if needed
5. Add to Clerk production settings

## 🐛 Troubleshooting

### "Invalid publishable key"
- Check key starts with `pk_live_`
- Verify copied entire key
- Restart dev server after adding

### OAuth not working in production
- Verify redirect URIs match exactly
- Check OAuth apps in production mode
- Ensure apps are approved/live

### Users not syncing
- Check Supabase function logs
- Verify JWT secret is set correctly
- Ensure functions are deployed

## 🎉 You're All Set!

Your app now uses **production Clerk authentication** with:
- Real OAuth providers
- Production user management
- Secure token handling
- All features working

**The integration is the same for test and production - just swap the key!**

