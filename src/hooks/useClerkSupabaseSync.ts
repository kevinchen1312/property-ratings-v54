/**
 * Clerk-Supabase Sync Hook
 * 
 * This hook manages the synchronization between Clerk authentication and Supabase.
 * It ensures that when a user signs in with Clerk, they also get a Supabase session
 * with the same user ID, maintaining compatibility with all existing features.
 */

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getSupabaseSessionForClerkUser, signOutBoth } from '../lib/clerkSupabaseSync';
import { supabase } from '../lib/supabase';
import { Session } from '../lib/types';

export function useClerkSupabaseSync() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncUser() {
      if (!isUserLoaded) return;

      setIsLoading(true);

      try {
        if (isSignedIn && user) {
          console.log('👤 Clerk user signed in, syncing to Supabase...', user.id);
          
          // Sync Clerk user to Supabase and get session
          await getSupabaseSessionForClerkUser(user);
          
          // Get the session-like object from global storage
          // (We're not using Supabase's auth.getSession because we have a custom JWT)
          const clerkSession = (global as any).__clerkUserSession;
          if (clerkSession) {
            setSupabaseSession(clerkSession as Session);
            console.log('✅ Supabase session established');
          } else {
            setSupabaseSession(null);
          }
        } else {
          console.log('👤 No Clerk user, clearing Supabase session');
          await signOutBoth();
          (global as any).__clerkUserSession = null;
          setSupabaseSession(null);
        }
      } catch (error) {
        console.error('Error syncing Clerk user to Supabase:', error);
        setSupabaseSession(null);
      } finally {
        setIsLoading(false);
      }
    }

    syncUser();
  }, [user, isSignedIn, isUserLoaded]);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    supabaseSession,
    isLoading: isLoading || !isUserLoaded,
    isAuthenticated: !!supabaseSession,
  };
}

