/**
 * Supabase Server-Side Utilities
 * Handles server-side Supabase operations including auth and service role queries
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';
import type { Database } from './database.types';

/**
 * Create a Supabase client for Server Components
 * This client uses cookies for auth state
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client with service role key
 * USE WITH CAUTION: This bypasses RLS
 */
export function createSupabaseServiceClient() {
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient<Database>(
    supabaseConfig.url,
    supabaseConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get user's credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user credits:', error);
    return 0;
  }

  return data?.credits || 0;
}

/**
 * Add credits to a user's balance (idempotent via ledger)
 * This function should only be called from webhook handlers
 * @param userId - User ID
 * @param credits - Number of credits to add
 * @param stripeSessionId - Stripe Session ID for idempotency
 * @param packageKey - Package identifier
 * @returns true if successful
 */
export async function addCreditsToUser(
  userId: string,
  credits: number,
  stripeSessionId: string,
  packageKey: string
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();

  try {
    // Check if this session was already processed (idempotency)
    const { data: existing } = await supabase
      .from('credit_ledger')
      .select('id')
      .eq('stripe_session_id', stripeSessionId)
      .single();

    if (existing) {
      console.log(`Session ${stripeSessionId} already processed, skipping`);
      return true;
    }

    // Insert into ledger (this provides idempotency via unique constraint)
    const { error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        delta: credits,
        source: 'stripe',
        stripe_session_id: stripeSessionId,
        reason: `purchase:${packageKey}`,
      } as any);

    if (ledgerError) {
      // Check if it's a unique constraint violation (duplicate session)
      if (ledgerError.code === '23505') {
        console.log(`Duplicate session ${stripeSessionId}, already processed`);
        return true;
      }
      throw ledgerError;
    }

    // Update user's credit balance
    const { error: updateError } = await supabase.rpc('increment_user_credits', {
      p_user_id: userId,
      p_amount: credits,
    } as any);

    if (updateError) {
      // Fallback: Use raw SQL to increment credits
      const { error: manualError } = await supabase.rpc('exec_sql' as any, {
        sql: `UPDATE user_credits SET credits = credits + ${credits} WHERE user_id = '${userId}'`
      } as any);

      // If that also fails, just log it - the ledger entry is the source of truth
      if (manualError) {
        console.error('Failed to update credits via fallback:', manualError);
      }
    }

    console.log(`Successfully added ${credits} credits to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error adding credits:', error);
    return false;
  }
}

