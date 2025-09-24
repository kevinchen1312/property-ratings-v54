// Supabase Edge Function: Create Stripe Checkout Session
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  propertyIds: string[];
  email: string;
  customerName?: string;
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const webhookUrl = Deno.env.get('WEBHOOK_URL') || 'https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook';

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Parse request body
    const { propertyIds, email, customerName }: CheckoutRequest = await req.json();

    // Validate input
    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0 || propertyIds.length > 10) {
      return new Response(
        JSON.stringify({ error: 'propertyIds must be an array of 1-10 property IDs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify properties exist
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .in('id', propertyIds);

    if (propertiesError) {
      throw new Error(`Database error: ${propertiesError.message}`);
    }

    if (properties.length !== propertyIds.length) {
      return new Response(
        JSON.stringify({ error: 'Some property IDs are invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate pricing: $10.00, $9.60, $9.20, etc.
    const basePrice = 10.00;
    const discountPerItem = 0.40;
    
    const lineItems = propertyIds.map((propertyId, index) => {
      const property = properties.find(p => p.id === propertyId)!;
      const unitPrice = Math.max(basePrice - (index * discountPerItem), 1.00); // Minimum $1.00
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Property Report: ${property.name}`,
            description: `Detailed rating report for ${property.address}`,
            metadata: {
              property_id: propertyId,
              property_name: property.name,
            },
          },
          unit_amount: Math.round(unitPrice * 100), // Convert to cents
        },
        quantity: 1,
      };
    });

    // Calculate total amount
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount / 100), 0);

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase')
      .insert({
        email,
        customer_name: customerName,
        total_amount: totalAmount,
        status: 'pending',
        metadata: {
          property_count: propertyIds.length,
          properties: properties.map(p => ({ id: p.id, name: p.name }))
        }
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    // Create purchase items
    const purchaseItems = propertyIds.map((propertyId, index) => ({
      purchase_id: purchase.id,
      property_id: propertyId,
      unit_price: Math.max(basePrice - (index * discountPerItem), 1.00),
    }));

    const { error: itemsError } = await supabase
      .from('purchase_item')
      .insert(purchaseItems);

    if (itemsError) {
      throw new Error(`Failed to create purchase items: ${itemsError.message}`);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      customer_email: email,
      metadata: {
        purchase_id: purchase.id,
        customer_email: email,
      },
      webhook_endpoint_id: webhookUrl,
    });

    // Update purchase with Stripe session ID
    await supabase
      .from('purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        purchase_id: purchase.id,
        total_amount: totalAmount,
        property_count: propertyIds.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Checkout error:', error);
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

