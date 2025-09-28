// supabase/functions/stripeWebhookPublic/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🚀 Webhook received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasStripeKey: !!stripeSecretKey,
      hasWebhookSecret: !!stripeWebhookSecret
    });

    if (!stripeWebhookSecret) {
      console.error('❌ Stripe webhook secret not configured');
      return new Response('Stripe webhook secret not configured', { status: 500 });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get the request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('📝 Request details:', {
      hasBody: !!body,
      hasSignature: !!signature,
      bodyLength: body.length
    });

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      console.log('✅ Webhook signature verified');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('📨 Received webhook event:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('💳 Processing successful checkout:', session.id);

      // Check if this is a credit purchase
      const { data: creditPurchase, error: purchaseError } = await supabase
        .from('credit_purchase')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single();

      console.log('🔍 Credit purchase lookup:', {
        found: !!creditPurchase,
        error: purchaseError?.message,
        sessionId: session.id
      });

      if (creditPurchase) {
        console.log('💰 Processing credit purchase:', creditPurchase.id);
        
        try {
          const { data: result, error: creditError } = await supabase.rpc('complete_credit_purchase', {
            p_stripe_session_id: session.id
          });

          console.log('💳 Credit purchase result:', {
            success: !!result,
            error: creditError?.message
          });

          if (creditError || !result) {
            console.error('❌ Failed to complete credit purchase:', creditError);
            return new Response('Failed to process credit purchase', { status: 500 });
          }

          console.log(`✅ Successfully added ${creditPurchase.credits} credits to user ${creditPurchase.user_id}`);
          return new Response(JSON.stringify({ 
            success: true, 
            message: `Added ${creditPurchase.credits} credits`,
            userId: creditPurchase.user_id 
          }), { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('❌ Error processing credit purchase:', error);
          return new Response('Error processing credit purchase', { status: 500 });
        }
      } else {
        console.log('ℹ️ Not a credit purchase, skipping');
      }
    }

    console.log('✅ Webhook processed successfully');
    return new Response(
      JSON.stringify({ success: true, received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
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
