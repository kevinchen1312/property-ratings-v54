import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // Use PKCE flow for mobile
  },
});

// CRITICAL: Patch Supabase auth methods to support Clerk sessions
// This makes all existing services work with Clerk authentication
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);

(supabase.auth as any).getUser = async () => {
  const clerkSession = (global as any).__clerkUserSession;
  if (clerkSession?.user) {
    return {
      data: { user: clerkSession.user },
      error: null,
    };
  }
  return originalGetUser();
};

(supabase.auth as any).getSession = async () => {
  const clerkSession = (global as any).__clerkUserSession;
  if (clerkSession) {
    return {
      data: { session: clerkSession },
      error: null,
    };
  }
  return originalGetSession();
};
