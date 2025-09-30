// Simplified Stripe Connect Function - for testing without full Connect setup
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  action: 'create' | 'get_status' | 'create_login_link';
  accountId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const access_token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userRes, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    const user = userRes.user;

    // Parse request body
    const { action, accountId }: ConnectRequest = await req.json();

    console.log(`Processing ${action} for user ${user.id}`);

    switch (action) {
      case 'create': {
        // For now, simulate account creation without actually calling Stripe
        // This lets us test the UI flow without Stripe Connect setup
        
        console.log('Simulating Stripe Connect account creation...');

        // Create a fake account record in database
        const fakeAccountId = `acct_test_${user.id.substring(0, 8)}`;
        
        const { error: dbError } = await supabase
          .from('user_stripe_accounts')
          .upsert({
            user_id: user.id,
            stripe_account_id: fakeAccountId,
            account_status: 'pending',
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
            country: 'US',
            currency: 'usd',
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save account information');
        }

        // Return a fake onboarding URL for testing
        const fakeOnboardingUrl = `https://connect.stripe.com/setup/test/${fakeAccountId}`;

        return new Response(
          JSON.stringify({
            success: true,
            onboardingUrl: fakeOnboardingUrl,
            accountId: fakeAccountId,
            message: 'TEST MODE: Account created successfully! In production, this would redirect to Stripe.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_status': {
        if (!accountId) {
          throw new Error('Account ID required for status check');
        }

        // Simulate account status check
        console.log('Simulating account status check...');

        // Update database with simulated "verified" status
        const { error: updateError } = await supabase
          .from('user_stripe_accounts')
          .update({
            account_status: 'active',
            details_submitted: true,
            charges_enabled: true,
            payouts_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', accountId)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Database update error:', updateError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            account: {
              id: accountId,
              details_submitted: true,
              charges_enabled: true,
              payouts_enabled: true,
              requirements: { currently_due: [], eventually_due: [] },
            },
            message: 'TEST MODE: Account verified successfully!',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_login_link': {
        if (!accountId) {
          throw new Error('Account ID required for login link');
        }

        // Return a fake dashboard URL
        const fakeDashboardUrl = `https://dashboard.stripe.com/test/connect/accounts/${accountId}`;

        return new Response(
          JSON.stringify({
            success: true,
            loginUrl: fakeDashboardUrl,
            message: 'TEST MODE: Dashboard link created!',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        message: 'Check function logs for details',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
