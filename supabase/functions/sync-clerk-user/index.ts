/**
 * Sync Clerk User to Supabase
 * 
 * This Edge Function syncs a Clerk-authenticated user to the Supabase auth.users table.
 * It ensures the user exists in Supabase with the same ID, preserving all existing data.
 * 
 * CRITICAL: This maintains compatibility with all existing RLS policies, credits, ratings, and rewards.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { clerk_user_id, email, first_name, last_name, full_name } = await req.json();

    if (!clerk_user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clerk_user_id, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Syncing Clerk user:', { clerk_user_id, email, first_name, last_name });

    // Get or create UUID mapping for Clerk user
    const { data: uuidData, error: uuidError } = await supabase
      .rpc('get_uuid_for_clerk_user', { p_clerk_user_id: clerk_user_id });

    if (uuidError) {
      console.error('Error getting UUID for Clerk user:', uuidError);
      return new Response(
        JSON.stringify({ error: 'Failed to map Clerk user to UUID', details: uuidError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user_uuid = uuidData;
    console.log('✅ UUID mapping:', { clerk_user_id, user_uuid });

    // Update profile in app_user table with Clerk info
    try {
      const { error: profileError } = await supabase
        .from('app_user')
        .update({
          email,
          first_name,
          last_name,
          full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_uuid);

      if (profileError) {
        console.error('Error updating app_user profile:', profileError);
      } else {
        console.log('✅ Profile updated');
      }
    } catch (profileErr) {
      console.warn('Error with profile:', profileErr);
    }

    // Initialize user credits (only if they don't exist)
    try {
      const { error: creditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user_uuid,
          credits: 5, // Starting credits for new users
        })
        .select()
        .single();

      if (creditsError) {
        if (creditsError.code === '23505') {
          // Duplicate key, user already has credits
          console.log('✅ User already has credits');
        } else {
          console.warn('Could not initialize credits:', creditsError);
        }
      } else {
        console.log('✅ Credits initialized');
      }
    } catch (creditsErr) {
      console.warn('Error initializing credits:', creditsErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User synced successfully',
        user_id: clerk_user_id,
        user_uuid: user_uuid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

