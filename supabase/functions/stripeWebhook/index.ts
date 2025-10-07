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

    // Initialize clients with service role (bypasses RLS)
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
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Debug logging
    console.log('Webhook secret length:', stripeWebhookSecret?.length);
    console.log('Webhook secret prefix:', stripeWebhookSecret?.substring(0, 10));
    console.log('Signature header:', signature?.substring(0, 20));
    console.log('Body length:', body?.length);

    // Verify the webhook signature (async version for Deno)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      console.error('Error details:', err.message);
      return new Response(`Invalid signature: ${err.message}`, { status: 400 });
    }

    console.log('Received webhook event:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing successful checkout:', session.id);

      // Check if this is a credit purchase or property report purchase
      const { data: creditPurchase } = await supabase
        .from('credit_purchase')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single();

      if (creditPurchase) {
        // Handle credit purchase
        console.log('🛒 Processing credit purchase:', {
          id: creditPurchase.id,
          user_id: creditPurchase.user_id,
          credits: creditPurchase.credits,
          status: creditPurchase.status,
          session_id: session.id
        });
        
        // If already completed, return success (idempotency)
        if (creditPurchase.status === 'completed') {
          console.log('✅ Purchase already completed, returning success');
          return new Response('Credit purchase already completed', { status: 200 });
        }
        
        try {
          const { data: result, error: creditError } = await supabase.rpc('complete_credit_purchase', {
            p_stripe_session_id: session.id
          });

          if (creditError) {
            console.error('❌ Failed to complete credit purchase:', {
              error: creditError,
              message: creditError.message,
              details: creditError.details,
              hint: creditError.hint,
              code: creditError.code
            });
            
            // Return 500 to let Stripe retry (it will retry with exponential backoff)
            return new Response(JSON.stringify({ 
              error: 'Failed to process credit purchase',
              details: creditError.message,
              session_id: session.id,
              will_retry: true
            }), { 
              status: 500, // Return 500 so Stripe will retry
              headers: { 'Content-Type': 'application/json' }
            });
          }

          if (!result) {
            console.error('⚠️ RPC returned false');
            
            // Return 500 to let Stripe retry
            return new Response(JSON.stringify({ 
              error: 'Failed to process credit purchase',
              details: 'RPC returned false',
              session_id: session.id,
              will_retry: true
            }), { 
              status: 500, // Return 500 so Stripe will retry
              headers: { 'Content-Type': 'application/json' }
            });
          }

          console.log(`✅ Successfully added ${creditPurchase.credits} credits to user ${creditPurchase.user_id}`);
          return new Response(JSON.stringify({
            success: true,
            message: 'Credit purchase completed',
            credits: creditPurchase.credits,
            user_id: creditPurchase.user_id
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          console.error('❌ Exception processing credit purchase:', err);
          
          // Return 500 to let Stripe retry
          return new Response(JSON.stringify({ 
            error: 'Exception processing credit purchase',
            details: err.message,
            session_id: session.id,
            will_retry: true
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle property report purchase (existing logic)
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

      // Process revenue sharing for each property
      for (const item of purchase.purchase_item) {
        try {
          console.log(`Processing revenue sharing for property: ${item.property_id}`);
          
          // Calculate revenue sharing: 50% gold, 20% silver, 10% bronze, 20% platform
          const totalRevenue = item.unit_price;
          const goldShare = totalRevenue * 0.50;
          const silverShare = totalRevenue * 0.20;
          const bronzeShare = totalRevenue * 0.10;
          const platformShare = totalRevenue * 0.20;

          // Get top 3 contributors for this property
          const { data: topContributorsData, error: topContributorsError } = await supabase
            .rpc('get_top_contributors', { property_uuid: item.property_id });

          if (topContributorsError) {
            console.error('Error getting top contributors:', topContributorsError);
            continue; // Skip this property but continue with others
          }

          const contributors = topContributorsData || [];
          const goldContributor = contributors.find((c: any) => c.rank === 1);
          const silverContributor = contributors.find((c: any) => c.rank === 2);
          const bronzeContributor = contributors.find((c: any) => c.rank === 3);

          console.log(`🥇 Gold contributor: ${goldContributor?.user_id} with ${goldContributor?.rating_count || 0} ratings`);
          console.log(`🥈 Silver contributor: ${silverContributor?.user_id} with ${silverContributor?.rating_count || 0} ratings`);
          console.log(`🥉 Bronze contributor: ${bronzeContributor?.user_id} with ${bronzeContributor?.rating_count || 0} ratings`);

          // Create revenue distribution record
          const { data: revenueDistribution, error: revenueError } = await supabase
            .from('revenue_distribution')
            .insert({
              purchase_id: purchase.id,
              property_id: item.property_id,
              total_revenue: totalRevenue,
              platform_share: platformShare,
              top_contributor_share: goldShare,
              other_contributors_share: silverShare + bronzeShare,
              top_contributor_id: goldContributor?.user_id,
              top_contributor_rating_count: goldContributor?.rating_count || 0,
            })
            .select()
            .single();

          if (revenueError) {
            console.error('Error creating revenue distribution:', revenueError);
            continue;
          }

          console.log('Revenue distribution created:', revenueDistribution.id);

          // Create contributor payouts
          const contributorPayouts = [];

          // Add gold contributor payout (50%)
          if (goldContributor?.user_id) {
            contributorPayouts.push({
              revenue_distribution_id: revenueDistribution.id,
              user_id: goldContributor.user_id,
              payout_amount: goldShare,
              rating_count: goldContributor.rating_count,
              is_top_contributor: true,
              status: 'pending',
            });
          }

          // Add silver contributor payout (20%)
          if (silverContributor?.user_id) {
            contributorPayouts.push({
              revenue_distribution_id: revenueDistribution.id,
              user_id: silverContributor.user_id,
              payout_amount: silverShare,
              rating_count: silverContributor.rating_count,
              is_top_contributor: false,
              status: 'pending',
            });
          }

          // Add bronze contributor payout (10%)
          if (bronzeContributor?.user_id) {
            contributorPayouts.push({
              revenue_distribution_id: revenueDistribution.id,
              user_id: bronzeContributor.user_id,
              payout_amount: bronzeShare,
              rating_count: bronzeContributor.rating_count,
              is_top_contributor: false,
              status: 'pending',
            });
          }

          // Insert all contributor payouts
          if (contributorPayouts.length > 0) {
            const { error: payoutError } = await supabase
              .from('contributor_payouts')
              .insert(contributorPayouts);

            if (payoutError) {
              console.error('Error creating contributor payouts:', payoutError);
            } else {
              console.log(`Created ${contributorPayouts.length} contributor payouts`);
              const rankLabels = ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'];
              contributorPayouts.forEach((payout, idx) => {
                console.log(`  - $${payout.payout_amount.toFixed(2)} to ${payout.user_id.substring(0, 8)} ${rankLabels[idx] || ''}`);
              });
            }
          }
          
          console.log(`Revenue sharing processed for property ${item.property_id}`);
        } catch (error) {
          console.error(`Failed to process revenue sharing for property ${item.property_id}:`, error);
          // Don't fail the webhook if revenue sharing fails
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

