# 🚀 Quick Start - Clerk OAuth Integration

## ⚡ 5-Minute Setup

### 1. Get Your Clerk Key (2 minutes)
1. Go to https://clerk.com and sign up
2. Create a new application
3. Go to **API Keys** → Copy your **Publishable Key**

### 2. Add Environment Variable (30 seconds)
Create `.env` file in project root:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here_from_step_1
```

### 3. Deploy Supabase Functions (2 minutes)
```bash
# Deploy the sync functions
.\deploy-clerk-functions.ps1

# Set JWT secret (get from Supabase Dashboard → Settings → API)
supabase secrets set SUPABASE_JWT_SECRET=your_jwt_secret_here
```

### 4. Start the App (30 seconds)
```bash
npm start
```

## ✅ You're Done!

You now have:
- ✨ Beautiful purple auth screen
- 📧 Email/password sign in
- 🔐 OAuth ready (configure providers below)

## 🔌 Configure OAuth Providers (Optional)

### Quick Enable in Clerk Dashboard:

#### Apple Sign In
1. Clerk Dashboard → **OAuth** → **Apple**
2. Follow the wizard
3. Needs Apple Developer account

#### Google Sign In  
1. Clerk Dashboard → **OAuth** → **Google**
2. Follow the wizard
3. Free Google Cloud account

#### Facebook Login
1. Clerk Dashboard → **OAuth** → **Facebook**
2. Follow the wizard
3. Free Facebook Developer account

## 🧪 Test It

### Email/Password (Works Immediately)
1. Open your app
2. Tap "Sign Up"
3. Enter name, email, password
4. Verify email
5. Sign in!

### OAuth (After Provider Setup)
1. Tap "Continue with Apple/Google/Facebook"
2. Complete OAuth flow
3. You're signed in!

## ✅ Verify Everything Works

Test these features to confirm integration:
- [ ] Can sign up with email
- [ ] Can sign in with email
- [ ] Can submit ratings
- [ ] Can view credits
- [ ] Can see rewards
- [ ] Can sign out

## 🐛 Issues?

### App won't start
- Restart after adding `.env` file
- Check that `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set

### "Failed to sync user"
- Deploy Supabase functions
- Set JWT secret

### OAuth not working
- Configure providers in Clerk Dashboard first
- Check provider is enabled

## 📚 More Info

See detailed guides:
- `CLERK-INTEGRATION-SETUP.md` - Full setup guide
- `CLERK-INTEGRATION-COMPLETE.md` - Complete documentation

## 🎉 That's It!

Your app now has modern OAuth authentication with zero data loss!

