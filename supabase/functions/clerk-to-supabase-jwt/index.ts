/**
 * Generate Supabase JWT for Clerk User
 * 
 * This Edge Function generates a valid Supabase JWT token for a Clerk-authenticated user.
 * This token allows the user to access Supabase resources with proper RLS policies.
 * 
 * CRITICAL: The token uses a UUID mapped from the Clerk user ID, maintaining compatibility 
 * with all existing database tables, RLS policies, credits, ratings, and rewards.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';
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
    // JWT secret is automatically available in Supabase Edge Functions
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Get request body
    const { clerk_user_id, email, user_uuid } = await req.json();

    if (!clerk_user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clerk_user_id, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 Generating Supabase JWT for Clerk user:', clerk_user_id);

    // Get UUID mapping if not provided
    let mapped_uuid = user_uuid;
    if (!mapped_uuid) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: uuidData, error: uuidError } = await supabase
        .rpc('get_uuid_for_clerk_user', { p_clerk_user_id: clerk_user_id });

      if (uuidError) {
        console.error('Error getting UUID for Clerk user:', uuidError);
        return new Response(
          JSON.stringify({ error: 'Failed to map Clerk user to UUID', details: uuidError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      mapped_uuid = uuidData;
      console.log('✅ UUID mapping:', { clerk_user_id, mapped_uuid });
    }

    // Create JWT payload matching Supabase's structure
    // CRITICAL: Use the UUID as 'sub' so auth.uid() returns the UUID
    const payload = {
      aud: 'authenticated',
      exp: getNumericDate(60 * 60 * 24), // 24 hours
      iat: getNumericDate(0),
      sub: mapped_uuid, // Use UUID so auth.uid() works with existing tables
      email,
      role: 'authenticated',
      user_metadata: {
        synced_from_clerk: true,
        clerk_user_id: clerk_user_id, // Store Clerk ID as metadata
      },
    };

    // Convert JWT secret to CryptoKey
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate JWT
    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      payload,
      key
    );

    console.log('✅ JWT generated successfully');

    return new Response(
      JSON.stringify({ 
        access_token: token,
        token_type: 'bearer',
        expires_in: 86400, // 24 hours
        user_uuid: mapped_uuid,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating JWT:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWT', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

