/**
 * Clerk-Supabase User Sync System
 * 
 * This service syncs Clerk users with Supabase auth.users table
 * to maintain compatibility with existing RLS policies and database structure.
 * 
 * CRITICAL: This preserves all existing user data, credits, ratings, and rewards.
 */

import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

/**
 * Generate a Supabase JWT token from Clerk session
 * This allows Clerk-authenticated users to access Supabase with proper RLS
 */
export async function generateSupabaseToken(clerkUserId: string, email: string, userUuid?: string): Promise<string> {
  try {
    // Call our Supabase Edge Function to generate a JWT
    const { data, error } = await supabase.functions.invoke('clerk-to-supabase-jwt', {
      body: {
        clerk_user_id: clerkUserId,
        email: email,
        user_uuid: userUuid,
      },
    });

    if (error) throw error;
    if (!data?.access_token) {
      throw new Error('No access token returned from JWT generation');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error generating Supabase token:', error);
    throw error;
  }
}

/**
 * Sync Clerk user to Supabase auth.users table
 * This ensures the user exists in Supabase with the same ID as Clerk
 */
export async function syncClerkUserToSupabase(clerkUser: ClerkUser): Promise<void> {
  try {
    const email = clerkUser.primaryEmailAddress?.emailAddress || 
                  clerkUser.emailAddresses[0]?.emailAddress;
    
    if (!email) {
      throw new Error('No email address found for Clerk user');
    }

    console.log('🔄 Syncing Clerk user to Supabase:', clerkUser.id, email);

    // Call our Supabase Edge Function to sync the user
    const { data, error } = await supabase.functions.invoke('sync-clerk-user', {
      body: {
        clerk_user_id: clerkUser.id,
        email: email,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      },
    });

    if (error) {
      console.error('Error syncing user:', error);
      throw error;
    }

    console.log('✅ User synced successfully:', data);
  } catch (error) {
    console.error('Error in syncClerkUserToSupabase:', error);
    throw error;
  }
}

/**
 * Get or create Supabase session for a Clerk-authenticated user
 * This bridges Clerk auth with Supabase RLS
 */
export async function getSupabaseSessionForClerkUser(
  clerkUser: ClerkUser
): Promise<void> {
  try {
    // First, sync the user to ensure they exist in Supabase and get UUID mapping
    const email = clerkUser.primaryEmailAddress?.emailAddress || 
                  clerkUser.emailAddresses[0]?.emailAddress;
    
    if (!email) {
      throw new Error('No email address found for Clerk user');
    }

    console.log('🔄 Syncing Clerk user to Supabase:', clerkUser.id, email);

    // Call our Supabase Edge Function to sync the user and get UUID
    const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-clerk-user', {
      body: {
        clerk_user_id: clerkUser.id,
        email: email,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      },
    });

    if (syncError) {
      console.error('Error syncing user:', syncError);
      throw syncError;
    }

    console.log('✅ User synced successfully:', syncData);

    // Generate a Supabase JWT token with the UUID mapping
    const user_uuid = syncData?.user_uuid;
    const supabaseToken = await generateSupabaseToken(clerkUser.id, email, user_uuid);
    console.log('✅ Supabase JWT token generated for Clerk user');

    // Store the token globally for direct API calls
    (global as any).__supabaseClerkToken = supabaseToken;
    
    // Create a full session object that matches Supabase's structure
    // CRITICAL: Use the UUID so auth.uid() returns the correct UUID
    const sessionObject = {
      access_token: supabaseToken,
      refresh_token: supabaseToken,
      expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      expires_in: 86400,
      token_type: 'bearer' as const,
      user: {
        id: user_uuid || clerkUser.id, // Use UUID mapping, fallback to Clerk ID
        aud: 'authenticated',
        role: 'authenticated',
        email: email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: 'clerk',
          providers: ['clerk'],
        },
        user_metadata: {
          synced_from_clerk: true,
          clerk_user_id: clerkUser.id, // Store Clerk ID as metadata
          first_name: clerkUser.firstName,
          last_name: clerkUser.lastName,
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    
    // Store for navigation and auth methods (patched in supabase.ts)
    (global as any).__clerkUserSession = sessionObject;

    console.log('✅ Supabase session established with UUID:', user_uuid);
  } catch (error) {
    console.error('Error getting Supabase session for Clerk user:', error);
    throw error;
  }
}

/**
 * Sign out from both Clerk and Supabase
 */
export async function signOutBoth(): Promise<void> {
  try {
    // Clear the stored tokens first
    (global as any).__supabaseClerkToken = null;
    (global as any).__clerkUserSession = null;
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    console.log('✅ Signed out from Supabase');
  } catch (error) {
    console.error('Error signing out from Supabase:', error);
  }
}

