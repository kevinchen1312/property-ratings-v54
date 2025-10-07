# 🎁 Referral System Setup Guide

## ✅ What's Been Implemented

The referral system has been set up with the following components:

### 1. **Mobile App - Rewards Screen** (`src/screens/RewardsScreen.tsx`)
- Generates a unique referral code for each user (first 8 characters of their user ID)
- Provides a "Share with Friends" button
- Creates referral links in format: `https://leadsong.com/referral/[CODE]`

### 2. **Website - Referral Landing Page** (`website/app/referral/[code]/`)
- Beautiful landing page that displays the referral code
- Shows app features and benefits
- Provides download buttons for iOS App Store and Google Play Store
- Automatically stores the referral code in localStorage for tracking

### 3. **App Store Links Configuration** (`website/lib/appStoreLinks.ts`)
- Centralized configuration file for app store URLs
- Easy to update when your app is published

---

## 🚀 Next Steps

### Step 1: Update App Store Links

Once your app is published to the App Store and Google Play Store, update the links in `website/lib/appStoreLinks.ts`:

```typescript
export const APP_STORE_LINKS = {
  // Replace with your actual iOS App Store link
  ios: 'https://apps.apple.com/app/leadsong/id[YOUR_APP_ID]',
  
  // Replace with your actual Google Play Store link
  android: 'https://play.google.com/store/apps/details?id=com.propertyratings.app',
};
```

**How to find your App Store URLs:**

**iOS:**
1. Go to App Store Connect
2. Navigate to your app
3. Copy the App Store URL (format: `https://apps.apple.com/app/your-app-name/idXXXXXXXXX`)

**Android:**
1. Go to Google Play Console
2. Navigate to your app
3. Copy the store listing URL (format: `https://play.google.com/store/apps/details?id=your.package.name`)

### Step 2: Deploy the Website Changes

Deploy your website to make the referral landing page live:

```bash
cd website
npm run build
# Deploy to your hosting (Vercel, Netlify, etc.)
```

### Step 3: Test the Referral Flow

1. Open the app and go to the Rewards tab
2. Tap "Share with Friends"
3. Share the link via any method
4. Open the link on another device
5. Verify the landing page displays correctly
6. Click the App Store or Google Play button
7. Verify it redirects to the correct store

---

## 📱 How It Works

### User Experience:

1. **User A** opens the Rewards tab in the app
2. **User A** taps "Share with Friends" 
3. Share sheet opens with message:
   ```
   Join me on Leadsong! Use my referral code ABC12345 to get started.
   
   https://leadsong.com/referral/ABC12345
   ```
4. **User B** receives the link and clicks it
5. **User B** sees a beautiful landing page with:
   - The referral code displayed prominently
   - App features and benefits
   - Download buttons for iOS and Android
6. **User B** clicks the appropriate store button
7. **User B** downloads and installs the app
8. When **User B** signs up, the referral code (stored in localStorage) can be used to track the referral

### Technical Flow:

1. Referral code is generated from user ID (first 8 chars, uppercase)
2. Landing page stores code in `localStorage.setItem('referralCode', code)`
3. When user signs up in the app, check for stored referral code
4. Link the new user to the referrer in your database

---

## 🔧 Optional Enhancements

### 1. Track Referral Conversions

Create a database table to track referrals:

```sql
-- Add to your Supabase database
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, rewarded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Implement Referral Rewards

Update the `RewardsScreen.tsx` to load and display referral rewards:

```typescript
// Fetch user's successful referrals
const { data: referrals } = await supabase
  .from('user_referrals')
  .select('*')
  .eq('referrer_id', userId)
  .eq('status', 'completed');
```

### 3. Auto-Apply Referral Code on Signup

In your auth flow (`src/screens/AuthScreen.tsx`), check for stored referral code:

```typescript
const referralCode = localStorage.getItem('referralCode');
if (referralCode) {
  // Store in database when user signs up
  await supabase.from('user_referrals').insert({
    referral_code: referralCode,
    referred_id: newUser.id
  });
}
```

### 4. Deep Linking (Advanced)

Set up deep linking so the app opens directly if already installed:

**Update `app.config.ts`:**
```typescript
ios: {
  associatedDomains: ['applinks:leadsong.com'],
},
android: {
  intentFilters: [
    {
      action: 'VIEW',
      data: [{ scheme: 'https', host: 'leadsong.com', pathPrefix: '/referral' }],
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ],
},
```

### 5. Social Media Preview Cards

Add Open Graph meta tags to the referral page for better social media sharing:

```typescript
// In website/app/referral/[code]/layout.tsx or page metadata
export const metadata = {
  openGraph: {
    title: 'Join me on Leadsong!',
    description: 'Rate properties and earn rewards',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join me on Leadsong!',
    description: 'Rate properties and earn rewards',
    images: ['/og-image.png'],
  },
};
```

---

## 🧪 Testing Checklist

- [ ] Referral link generates correctly in app
- [ ] Landing page displays referral code
- [ ] iOS download button links to App Store (once published)
- [ ] Android download button links to Google Play (once published)
- [ ] Referral code is stored in localStorage
- [ ] Landing page is mobile-responsive
- [ ] Share functionality works on iOS
- [ ] Share functionality works on Android
- [ ] Social media preview looks good (if implemented)

---

## 🎯 Before Launch

**Important:** The current app store links are **placeholders**. You MUST update them in `website/lib/appStoreLinks.ts` before launching the referral system!

**Current Status:**
- ✅ Referral UI in mobile app
- ✅ Landing page created
- ⏳ **App Store links need updating**
- ⏳ Referral tracking (optional, needs implementation)
- ⏳ Referral rewards (optional, needs implementation)

---

## 📞 Support

If you need help with:
- Publishing to App Store / Google Play
- Setting up deep linking
- Implementing referral tracking
- Reward distribution logic

Feel free to ask for assistance!
