// Production-ready Stripe Payout Processing
// This version actually transfers money to raters' connected Stripe Express accounts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const access_token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    const user = userRes.user;

    console.log(`Processing payouts for user ${user.id}`);

    // Get user's Stripe Connect account
    const { data: stripeAccount, error: stripeAccountError } = await supabase
      .from('user_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (stripeAccountError || !stripeAccount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NO_STRIPE_ACCOUNT',
          message: 'Please connect your bank account via Stripe Express first',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PAYOUTS_NOT_ENABLED',
          message: 'Your Stripe account setup is incomplete. Please complete the onboarding process.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all pending payouts for this user
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('contributor_payouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      throw new Error('Failed to fetch pending payouts');
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending payouts to process',
          totalPayouts: 0,
          successfulPayouts: 0,
          failedPayouts: 0,
          totalAmount: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total payout amount
    const totalAmount = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.payout_amount), 0);

    // Stripe requires amounts in cents and has a minimum of $1.00
    const amountInCents = Math.round(totalAmount * 100);
    
    if (amountInCents < 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MINIMUM_AMOUNT',
          message: 'Minimum payout amount is $1.00',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing $${totalAmount.toFixed(2)} payout to ${stripeAccount.stripe_account_id}`);

    // Process the payout using Stripe Transfer
    let transfer;
    let transferError = null;

    try {
      // For demo/test accounts (those starting with 'acct_demo_'), simulate the transfer
      if (stripeAccount.stripe_account_id.startsWith('acct_demo_')) {
        console.log('🧪 Demo mode: Simulating Stripe transfer');
        transfer = {
          id: `tr_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: amountInCents,
          currency: 'usd',
          destination: stripeAccount.stripe_account_id,
        };
      } else {
        // Real Stripe transfer for production accounts
        console.log('💳 Creating real Stripe transfer');
        transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: stripeAccount.stripe_account_id,
          description: `Payout for ${pendingPayouts.length} property rating contribution${pendingPayouts.length !== 1 ? 's' : ''}`,
          metadata: {
            user_id: user.id,
            payout_count: pendingPayouts.length.toString(),
            payout_ids: pendingPayouts.map(p => p.id).join(','),
          },
        });
      }

      console.log(`✅ Transfer successful: ${transfer.id}`);

    } catch (error) {
      console.error('❌ Stripe transfer failed:', error);
      transferError = error;

      // Mark payouts as failed
      for (const payout of pendingPayouts) {
        await supabase
          .from('contributor_payouts')
          .update({
            status: 'failed',
            payout_reference: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_TRANSFER_FAILED',
          message: `Stripe transfer failed: ${error.message}`,
          details: error.type || 'unknown',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all payouts as paid
    const processedAt = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    for (const payout of pendingPayouts) {
      const { error: updateError } = await supabase
        .from('contributor_payouts')
        .update({
          status: 'paid',
          payout_method: 'stripe_transfer',
          payout_reference: transfer.id,
          processed_at: processedAt,
          updated_at: processedAt,
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error(`Error updating payout ${payout.id}:`, updateError);
        failCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Updated ${successCount} payouts as paid`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${successCount} payout${successCount !== 1 ? 's' : ''} totaling $${totalAmount.toFixed(2)}`,
        totalPayouts: pendingPayouts.length,
        successfulPayouts: successCount,
        failedPayouts: failCount,
        totalAmount: totalAmount,
        transferId: transfer.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});