// Stripe Connect Webhook Handler
// Keeps user Stripe Connect account status in sync with Stripe
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
    const stripeWebhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')!;

    if (!stripeWebhookSecret) {
      console.error('❌ STRIPE_CONNECT_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get the request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    console.log('📥 Received webhook with signature');

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log(`✅ Webhook verified: ${event.type}`);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, { 
        status: 400 
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log(`📝 Account updated: ${account.id}`);
        
        await syncAccountStatus(supabase, account);
        break;
      }

      case 'account.application.authorized': {
        const application = event.data.object as any;
        console.log(`✅ Account authorized: ${application.account}`);
        break;
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as any;
        console.log(`❌ Account deauthorized: ${application.account}`);
        
        // Mark account as inactive
        await supabase
          .from('user_stripe_accounts')
          .update({
            account_status: 'inactive',
            payouts_enabled: false,
            charges_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', application.account);
        
        break;
      }

      case 'account.external_account.created':
      case 'account.external_account.updated': {
        // External account (bank account) was added/updated
        const externalAccount = event.data.object as any;
        const accountId = externalAccount.account;
        
        console.log(`💳 External account ${event.type}: ${accountId}`);
        
        // Fetch full account details to get updated status
        const account = await stripe.accounts.retrieve(accountId);
        await syncAccountStatus(supabase, account);
        break;
      }

      case 'account.external_account.deleted': {
        const externalAccount = event.data.object as any;
        const accountId = externalAccount.account;
        
        console.log(`🗑️ External account deleted: ${accountId}`);
        
        // Fetch account and sync - may disable payouts if no valid bank account
        const account = await stripe.accounts.retrieve(accountId);
        await syncAccountStatus(supabase, account);
        break;
      }

      case 'capability.updated': {
        const capability = event.data.object as any;
        const accountId = capability.account;
        
        console.log(`🔧 Capability updated for account: ${accountId}`);
        
        // Fetch full account details
        const account = await stripe.accounts.retrieve(accountId);
        await syncAccountStatus(supabase, account);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Sync Stripe account status to database
 */
async function syncAccountStatus(supabase: any, account: Stripe.Account) {
  try {
    console.log(`🔄 Syncing account status for ${account.id}`);
    
    // Determine overall account status
    let accountStatus = 'pending';
    if (account.details_submitted && account.payouts_enabled && account.charges_enabled) {
      accountStatus = 'active';
    } else if (account.requirements?.disabled_reason) {
      accountStatus = 'restricted';
    }

    // Update database
    const { data, error } = await supabase
      .from('user_stripe_accounts')
      .update({
        account_status: accountStatus,
        details_submitted: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        country: account.country || null,
        currency: account.default_currency || 'usd',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id)
      .select();

    if (error) {
      console.error('❌ Database update error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ No account found in database for ${account.id}`);
      // Account might not exist in database yet - this is OK for new accounts
    } else {
      console.log(`✅ Account status synced: ${accountStatus}`);
      console.log(`   - Details submitted: ${account.details_submitted}`);
      console.log(`   - Charges enabled: ${account.charges_enabled}`);
      console.log(`   - Payouts enabled: ${account.payouts_enabled}`);
    }

  } catch (error) {
    console.error('❌ Failed to sync account status:', error);
    throw error;
  }
}
