import { supabase } from './supabase';
import { Session } from './types';
import * as SecureStore from 'expo-secure-store';

export async function getInitialSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error in getInitialSession:', error);
    return null;
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function signUp(
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string,
  referralCode?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        incoming_referral_code: referralCode || null,
      },
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign out - works with both Clerk and legacy Supabase auth
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  // Clear Clerk session tokens from memory
  (global as any).__supabaseClerkToken = null;
  (global as any).__clerkUserSession = null;
  
  // Clear Clerk tokens from Expo Secure Store
  try {
    // Clerk stores tokens with the __clerk_client_jwt key
    await SecureStore.deleteItemAsync('__clerk_client_jwt');
    await SecureStore.deleteItemAsync('__clerk_session_token');
    await SecureStore.deleteItemAsync('__clerk_refresh_token');
    console.log('✅ Cleared Clerk tokens from Secure Store');
  } catch (err) {
    console.warn('Could not clear Clerk tokens:', err);
  }
  
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
