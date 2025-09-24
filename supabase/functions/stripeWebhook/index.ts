// Supabase Edge Function: Stripe Webhook Handler
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function generatePropertyReport(propertyId: string): Promise<string> {
  // Call our existing generatePropertyReport function
  const reportResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/generatePropertyReport`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ propertyId }),
    }
  );

  if (!reportResponse.ok) {
    throw new Error(`Report generation failed: ${reportResponse.statusText}`);
  }

  const result = await reportResponse.json();
  return result.signedUrl;
}

async function sendPurchaseConfirmationEmail(
  email: string,
  customerName: string,
  properties: any[],
  reportUrls: { propertyId: string; url: string; propertyName: string }[]
) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const propertyList = reportUrls.map(report => 
    `<li><strong>${report.propertyName}</strong><br>
     <a href="${report.url}" style="color: #0066cc; text-decoration: none;">Download Report</a></li>`
  ).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Property Reports Purchase Confirmation</h2>
      
      <p>Dear ${customerName || 'Customer'},</p>
      
      <p>Thank you for your purchase! Your property reports are ready for download.</p>
      
      <h3>Your Reports:</h3>
      <ul style="list-style: none; padding: 0;">
        ${propertyList}
      </ul>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Important:</strong> These download links are valid for 7 days. Please save your reports to your device.</p>
      </div>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>Property Ratings Team</p>
    </div>
  `;

  const result = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: `Your Property Reports - ${properties.length} Report${properties.length > 1 ? 's' : ''} Ready`,
    html: htmlContent,
  });

  if (result.error) {
    throw new Error(`Email sending failed: ${result.error.message}`);
  }

  return result.data?.id;
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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    if (!stripeWebhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get the request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('Received webhook event:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing successful checkout:', session.id);

      // Get purchase from database
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase')
        .select('*, purchase_item(*, property(name, address))')
        .eq('stripe_session_id', session.id)
        .single();

      if (purchaseError) {
        console.error('Purchase not found:', purchaseError);
        return new Response('Purchase not found', { status: 404 });
      }

      // Update purchase status to completed
      await supabase
        .from('purchase')
        .update({ 
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', purchase.id);

      // Generate reports for each property
      const reportUrls: { propertyId: string; url: string; propertyName: string }[] = [];
      
      for (const item of purchase.purchase_item) {
        try {
          console.log(`Generating report for property: ${item.property_id}`);
          const reportUrl = await generatePropertyReport(item.property_id);
          
          // Update purchase item with report URL
          await supabase
            .from('purchase_item')
            .update({ 
              report_url: reportUrl,
              report_generated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          reportUrls.push({
            propertyId: item.property_id,
            url: reportUrl,
            propertyName: item.property.name,
          });

          console.log(`Report generated successfully for ${item.property.name}`);
        } catch (error) {
          console.error(`Failed to generate report for property ${item.property_id}:`, error);
          // Continue with other reports even if one fails
        }
      }

      // Send confirmation email with report links
      if (reportUrls.length > 0) {
        try {
          await sendPurchaseConfirmationEmail(
            purchase.email,
            purchase.customer_name || 'Customer',
            purchase.purchase_item.map(item => item.property),
            reportUrls
          );
          console.log(`Confirmation email sent to ${purchase.email}`);
        } catch (error) {
          console.error('Failed to send confirmation email:', error);
          // Don't fail the webhook if email fails
        }
      }

      console.log(`Purchase ${purchase.id} processed successfully`);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
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

