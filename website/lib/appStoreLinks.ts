/**
 * App Store Links Configuration
 * 
 * Update these URLs with your actual App Store and Google Play Store links
 * once your app is published.
 */

export const APP_STORE_LINKS = {
  // iOS App Store Link
  // Format: https://apps.apple.com/app/your-app-name/id[APP_ID]
  // Example: https://apps.apple.com/app/instagram/id389801252
  ios: 'https://apps.apple.com/app/leadsong/id123456789',
  
  // Google Play Store Link
  // Format: https://play.google.com/store/apps/details?id=[PACKAGE_NAME]
  // Example: https://play.google.com/store/apps/details?id=com.instagram.android
  android: 'https://play.google.com/store/apps/details?id=com.propertyratings.app',
  
  // Alternative: Use deep links that work for both installed apps and web
  // These will open the app if installed, or redirect to store if not
  universalLink: {
    ios: 'https://leadsong.com/app',
    android: 'https://leadsong.com/app',
  },
};

// App information
export const APP_INFO = {
  name: 'Leadsong',
  bundleId: {
    ios: 'com.propertyratings.app',
    android: 'com.propertyratings.app',
  },
  description: 'Rate residential properties based on noise levels, safety, and cleanliness. Get rewarded for your contributions!',
};
