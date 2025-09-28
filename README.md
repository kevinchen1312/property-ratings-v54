# Property Ratings App

A React Native app built with Expo that shows your current location on a map with Supabase authentication.

## Setup and Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Expo CLI globally (if not already installed):**
   ```bash
   npm install -g @expo/cli
   ```

3. **Environment Setup (Optional):**
   The app has fallback Supabase credentials configured, so it should work out of the box for testing.
   
   If you want to use your own Supabase instance, create a `.env` file in the root directory with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   ```

   Replace with your actual credentials. The Google Maps API key is only needed for iOS maps.

4. **Supabase Setup:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings → API to find your URL and anon key
   - Enable email authentication in Authentication → Settings

## Running the App

1. **Start the development server:**
   ```bash
   npm run start
   ```

2. **Run on iOS simulator:**
   ```bash
   npm run ios
   ```
   Or press `i` in the terminal after running `npm run start`

3. **Run on Android:**
   ```bash
   npm run android
   ```
   Or press `a` in the terminal after running `npm run start`

## Quick Testing for Other Developers

**Want to test this app quickly?** Just run:

```bash
git clone <repository-url>
cd property-ratings-v54
npm install
npm run start
```

The app will work immediately with the configured Supabase backend. No additional setup required for basic testing!

**Note for iOS testing:** Maps may not work without a Google Maps API key. Android uses Google Maps by default and should work fine.

## Usage

1. **Create Account:** Launch the app and tap "Sign Up" to create a new account
2. **Sign In:** Use your email and password to sign in
3. **View Map:** Once authenticated, you'll see your location and can access the map features
4. **Sign Out:** Use the "Logout" button in the header to sign out

## Features

- ✅ User authentication with Supabase
- ✅ Persistent login sessions across app restarts
- ✅ Location permission handling
- ✅ Real-time location tracking
- ✅ Interactive map with user location
- ✅ TypeScript support
- ✅ React Navigation setup

## Project Structure

```
property-ratings-v54/
├── src/
│   ├── navigation/
│   │   └── index.tsx          # Navigation with auth gating
│   ├── screens/
│   │   ├── AuthScreen.tsx     # Sign up/sign in screen
│   │   └── MapScreen.tsx      # Main map screen with location
│   ├── components/
│   │   └── Loading.tsx        # Loading component
│   └── lib/
│       ├── auth.ts            # Authentication helpers
│       ├── supabase.ts        # Supabase client setup
│       └── types.ts           # TypeScript type definitions
├── App.tsx                    # App entry point
├── app.config.ts              # Expo configuration with env vars
└── package.json               # Dependencies and scripts
```

## Authentication Flow

- **Logged Out:** Users see the AuthScreen with sign up/login options
- **Logged In:** Users see the MapScreen with location features
- **Session Persistence:** Login state is preserved across app restarts using AsyncStorage

## Permissions

The app requests the following permissions:
- **Location (iOS)**: "We use your location to validate proximity to properties (within 200m) and enable on-site ratings."
