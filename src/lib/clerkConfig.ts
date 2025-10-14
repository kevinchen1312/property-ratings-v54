import * as SecureStore from 'expo-secure-store';

// Token cache for Clerk using Expo Secure Store
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore get error:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore save error:', error);
    }
  },
};

// Clerk publishable key from environment
export const CLERK_PUBLISHABLE_KEY = 
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY not found in environment');
}

