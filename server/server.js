// Express Server for Property Reports Checkout
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { jsPDF } = require('jspdf');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use('/webhook', express.raw({ type: 'application/json' })); // Raw body for webhooks
app.use(express.json()); // JSON body for other routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create checkout session
app.post('/create-checkout', async (req, res) => {
  try {
    const { propertyIds, email, customerName } = req.body;

    // Validate input
    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0 || propertyIds.length > 10) {
      return res.status(400).json({ 
        error: 'propertyIds must be an array of 1-10 property IDs' 
      });
    }

    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Valid email address required' 
      });
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
      return res.status(400).json({ 
        error: 'Some property IDs are invalid' 
      });
    }

    // Calculate pricing: $10.00, $9.60, $9.20, etc.
    const basePrice = 10.00;
    const discountPerItem = 0.40;
    
    const lineItems = propertyIds.map((propertyId, index) => {
      const property = properties.find(p => p.id === propertyId);
      const unitPrice = Math.max(basePrice - (index * discountPerItem), 1.00);
      
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
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      customer_email: email,
      metadata: {
        purchase_id: purchase.id,
        customer_email: email,
      },
    });

    // Update purchase with Stripe session ID
    await supabase
      .from('purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      purchase_id: purchase.id,
      total_amount: totalAmount,
      property_count: propertyIds.length,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Generate property report (simplified version)
async function generatePropertyReport(propertyId) {
  try {
    // Fetch property data
    const { data: property, error: propError } = await supabase
      .from('property')
      .select('*')
      .eq('id', propertyId)
      .single();
      
    if (propError) throw new Error(`Property not found: ${propError.message}`);
    
    // Fetch all ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
      
    if (ratingsError) throw new Error(`Ratings fetch failed: ${ratingsError.message}`);
    
    // Generate PDF (simplified - you can enhance this)
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Property Rating Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Property: ${property.name}`, 20, 40);
    doc.text(`Address: ${property.address}`, 20, 50);
    doc.text(`Total Ratings: ${ratings.length}`, 20, 60);
    
    // For this example, return a mock URL
    // In production, you'd upload to storage and return the actual URL
    return `https://example.com/reports/${propertyId}-${Date.now()}.pdf`;
    
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

// Stripe webhook handler
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Get purchase from database
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase')
        .select('*, purchase_item(*, property(name, address))')
        .eq('stripe_session_id', session.id)
        .single();

      if (purchaseError) {
        console.error('Purchase not found:', purchaseError);
        return res.status(404).send('Purchase not found');
      }

      // Update purchase status
      await supabase
        .from('purchase')
        .update({ 
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq('id', purchase.id);

      // Generate reports
      const reportUrls = [];
      for (const item of purchase.purchase_item) {
        try {
          const reportUrl = await generatePropertyReport(item.property_id);
          
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
        } catch (error) {
          console.error(`Failed to generate report for property ${item.property_id}:`, error);
        }
      }

      // Send confirmation email
      if (reportUrls.length > 0) {
        const propertyList = reportUrls.map(report => 
          `• ${report.propertyName}: ${report.url}`
        ).join('\\n');

        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: purchase.email,
          subject: `Your Property Reports - ${reportUrls.length} Report${reportUrls.length > 1 ? 's' : ''} Ready`,
          text: `Your property reports are ready:\\n\\n${propertyList}\\n\\nThank you for your purchase!`,
        });
      }

      console.log(`Purchase ${purchase.id} processed successfully`);
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).send('Webhook processing failed');
    }
  }

  res.json({ received: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Checkout endpoint: http://localhost:${PORT}/create-checkout`);
});

module.exports = app;

