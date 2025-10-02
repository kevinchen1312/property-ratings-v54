// supabase/functions/createCreditCheckout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

console.log('🔧 Environment variables loaded:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceRole: !!SUPABASE_SERVICE_ROLE,
  hasStripeKey: !!STRIPE_SECRET_KEY,
  stripeKeyPrefix: STRIPE_SECRET_KEY?.substring(0, 7) || 'none',
  allEnvKeys: Object.keys(Deno.env.toObject())
});

// Only create Stripe instance if we have the key
let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1,
    price: 10.00,
    description: 'Perfect for trying out our reports'
  },
  {
    id: 'value',
    name: 'Value Pack',
    credits: 5,
    price: 45.00,
    description: 'Most popular choice - save $5'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 10,
    price: 80.00,
    description: 'For serious property researchers - save $20'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 25,
    price: 175.00,
    description: 'Best value for bulk purchases - save $75'
  }
];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }


  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    console.log('🚀 Credit checkout request started');
    console.log('🔍 Environment check:', {
      hasStripeKey: !!STRIPE_SECRET_KEY,
      stripeKeyLength: STRIPE_SECRET_KEY?.length || 0,
      stripeKeyPrefix: STRIPE_SECRET_KEY?.substring(0, 7) || 'none'
    });
    
    // Check environment variables
    if (!STRIPE_SECRET_KEY || !stripe) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      console.error('Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ error: "Stripe not configured" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error('❌ No authorization header');
      return new Response("Unauthorized", { status: 401 });
    }
    
    const access_token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { data: userRes, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      console.error('❌ User authentication failed:', userErr);
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userRes.user;
    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const { packageId, email } = await req.json();
    console.log('📦 Request data:', { packageId, email });
    
    if (!packageId || !email) {
      console.error('❌ Missing required fields:', { packageId, email });
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format:', email);
      return new Response(JSON.stringify({ error: "Invalid email address" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      console.error('❌ Invalid credit package:', packageId);
      return new Response(JSON.stringify({ error: "Invalid credit package" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    console.log('✅ Credit package found:', creditPackage);

    // Create credit purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchase')
      .insert({
        user_id: user.id,
        email,
        package_id: packageId,
        credits: creditPackage.credits,
        amount: creditPackage.price,
        status: 'pending',
        metadata: {
          package_name: creditPackage.name,
          package_description: creditPackage.description
        }
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Purchase creation error:", purchaseError);
      return new Response(JSON.stringify({ error: "Failed to create purchase record" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: creditPackage.name,
            description: `${creditPackage.credits} credits - ${creditPackage.description}`,
            metadata: {
              package_id: packageId,
              credits: creditPackage.credits.toString(),
            },
          },
          unit_amount: Math.round(creditPackage.price * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://leadsong.app/return`,
      cancel_url: `https://leadsong.app`,
      customer_email: email,
      metadata: {
        purchase_id: purchase.id,
        user_id: user.id,
        package_id: packageId,
        credits: creditPackage.credits.toString(),
      },
    });

    // Update purchase with Stripe session ID
    await supabase
      .from('credit_purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        purchase_id: purchase.id,
        package: creditPackage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Credit checkout error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
