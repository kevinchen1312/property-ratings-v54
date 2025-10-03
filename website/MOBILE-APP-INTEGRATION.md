# Mobile App Integration Guide

This guide shows how to integrate the credit purchase website with your React Native/Expo mobile app.

## Overview

```
Mobile App → Opens web URL → User purchases → Redirected back → App refreshes credits
```

## 1. Opening the Credits Page

### From Your Mobile App

When the user wants to buy credits, open the website in their browser:

```typescript
// src/screens/BuyCreditsScreen.tsx or similar
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';

async function openCreditsPurchase() {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      Alert.alert('Please sign in first');
      return;
    }

    // Option A: Simple approach (user stays logged in via cookies)
    const url = 'https://leadsong.com/credits';
    
    // Option B: Pass access token explicitly (more secure for first time)
    // const url = `https://leadsong.com/credits?access_token=${session.access_token}`;
    
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Error', 'Could not open credits page');
    console.error(error);
  }
}
```

### In Your UI

```tsx
<TouchableOpacity onPress={openCreditsPurchase}>
  <Text>Buy Credits</Text>
</TouchableOpacity>
```

## 2. Handle Deep Link Return

### Configure Deep Links in Your App

**app.config.ts** (Expo):

```typescript
export default {
  // ... other config
  scheme: "leadsong",
  ios: {
    bundleIdentifier: "com.leadsong.app",
    associatedDomains: ["applinks:leadsong.com"], // For universal links
  },
  android: {
    package: "com.leadsong.app",
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: "leadsong",
          },
          {
            scheme: "https",
            host: "leadsong.com",
            pathPrefix: "/return",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
};
```

### Listen for Deep Links

**App.tsx** or navigation setup:

```typescript
import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Linking from 'expo-linking';

export default function App() {
  useEffect(() => {
    // Handle initial URL if app was closed
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL when app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return <NavigationContainer>{/* Your app */}</NavigationContainer>;
}

function handleDeepLink(url: string) {
  console.log('Received deep link:', url);

  // Parse the URL
  const { hostname, path, queryParams } = Linking.parse(url);

  // Check if it's a purchase success
  if (
    path === 'purchase/success' ||
    (hostname === 'leadsong.com' && path === '/return')
  ) {
    handlePurchaseSuccess(queryParams?.session_id);
  }
}
```

### Handle Purchase Success

```typescript
import { supabase } from './lib/supabase';

async function handlePurchaseSuccess(sessionId?: string) {
  console.log('Purchase completed!', sessionId);

  // Option A: Fetch credits directly from Supabase
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (data) {
      console.log('New credit balance:', data.credits);
      // Update your global state / context
      updateCreditsInApp(data.credits);
    }
  }

  // Option B: Call the web API
  // (useful if you have additional logic or want CORS setup)
  // const response = await fetch('https://leadsong.com/api/me/credits', {
  //   headers: {
  //     'Authorization': `Bearer ${session.access_token}`,
  //   },
  // });
  // const { credits } = await response.json();

  // Show success message
  Alert.alert(
    'Credits Added!',
    'Your credits have been added to your account.',
    [{ text: 'OK' }]
  );

  // Navigate to a relevant screen
  // navigation.navigate('Home');
}

function updateCreditsInApp(credits: number) {
  // Update your global state
  // This could be Context, Redux, Zustand, etc.
}
```

## 3. Display Credits in Your App

### In Your Header/Menu

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function CreditBadge() {
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    fetchCredits();

    // Subscribe to realtime updates (optional)
    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setCredits(payload.new.credits);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchCredits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (data) {
      setCredits(data.credits);
    }
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.creditsText}>{credits}</Text>
    </View>
  );
}
```

## 4. Polling for Credit Updates (Fallback)

If the user returns before the webhook completes (rare), poll for updates:

```typescript
async function pollForCredits(maxAttempts = 10, interval = 1000) {
  let attempts = 0;
  const initialCredits = await fetchCurrentCredits();

  const poll = setInterval(async () => {
    attempts++;
    const newCredits = await fetchCurrentCredits();

    if (newCredits > initialCredits) {
      // Credits updated!
      clearInterval(poll);
      updateCreditsInApp(newCredits);
      Alert.alert('Credits Added!', `You now have ${newCredits} credits`);
    }

    if (attempts >= maxAttempts) {
      clearInterval(poll);
      // Still show success, credits will appear soon
      Alert.alert(
        'Processing',
        'Your purchase is being processed. Credits will appear shortly.'
      );
    }
  }, interval);
}

async function fetchCurrentCredits(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  return data?.credits || 0;
}
```

## 5. Universal Links (Optional but Recommended)

Universal links allow seamless app opening without a prompt.

### iOS Setup

1. Host an `apple-app-site-association` file at:
   ```
   https://leadsong.com/.well-known/apple-app-site-association
   ```

2. File contents:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAMID.com.leadsong.app",
           "paths": ["/return", "/return/*", "/credits", "/credits/*"]
         }
       ]
     }
   }
   ```

3. Update `app.config.ts`:
   ```typescript
   ios: {
     associatedDomains: ["applinks:leadsong.com"]
   }
   ```

4. Update website deep link config (`.env`):
   ```env
   APP_SUCCESS_DEEPLINK_SCHEME=https://leadsong.com/return
   ```

### Android Setup

1. Generate SHA256 fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore
   ```

2. Create `assetlinks.json`:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.leadsong.app",
       "sha256_cert_fingerprints": ["YOUR_SHA256_HERE"]
     }
   }]
   ```

3. Host at:
   ```
   https://leadsong.com/.well-known/assetlinks.json
   ```

## 6. Testing

### Test Deep Links (Without Website)

**iOS**:
```bash
xcrun simctl openurl booted "leadsong://purchase/success?session_id=test123"
```

**Android**:
```bash
adb shell am start -a android.intent.action.VIEW -d "leadsong://purchase/success?session_id=test123" com.leadsong.app
```

### Test Full Flow

1. Run the website locally (see QUICKSTART.md)
2. Run your mobile app on device/simulator
3. In the app, tap "Buy Credits"
4. Complete test purchase (use Stripe test card)
5. Should redirect back to app
6. Credits should update

## 7. Error Handling

```typescript
async function openCreditsPurchase() {
  try {
    const url = 'https://leadsong.com/credits';
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert('Error', 'Cannot open browser');
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening credits page:', error);
    Alert.alert('Error', 'Could not open credits page');
  }
}

function handleDeepLink(url: string) {
  try {
    // ... parsing logic
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
}
```

## 8. Complete Example Component

```tsx
// src/screens/BuyCreditsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';

export function BuyCreditsScreen({ navigation }) {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();

    // Listen for deep link return
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('purchase/success')) {
        handlePurchaseSuccess();
      }
    });

    return () => subscription.remove();
  }, []);

  async function fetchCredits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (data) {
      setCredits(data.credits);
    }
    setLoading(false);
  }

  async function openWebPurchase() {
    try {
      await Linking.openURL('https://leadsong.com/credits');
    } catch (error) {
      Alert.alert('Error', 'Could not open purchase page');
    }
  }

  async function handlePurchaseSuccess() {
    // Refresh credits
    await fetchCredits();
    Alert.alert('Success!', 'Your credits have been added');
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Current Balance: {credits} credits
      </Text>

      <TouchableOpacity
        onPress={openWebPurchase}
        style={{
          backgroundColor: '#667eea',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 18 }}>Buy More Credits</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 9. Troubleshooting

### Deep link not working

- Check app scheme is registered correctly
- Test with manual deep link command (see "Testing" above)
- Check app is installed on device
- Verify URL format matches exactly

### Credits not updating

- Check webhook was received (Stripe Dashboard)
- Check Supabase `credit_ledger` table
- Check `profiles.credits` was incremented
- Try polling for updates (see section 4)

### Auth issues

- Ensure user is signed in before opening web page
- Consider passing `access_token` in URL query params
- Check Supabase session is valid

## Support

Questions? Check the main [README.md](./README.md) or contact support@leadsong.com

