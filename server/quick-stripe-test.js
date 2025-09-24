// Quick Stripe test - creates checkout and opens it
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// Test route that creates checkout and redirects
app.get('/test-checkout', async (req, res) => {
  try {
    console.log('🧪 Creating test checkout session...');
    
    const testData = {
      propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'],
      email: 'test@example.com',
      customerName: 'Test Customer'
    };

    // Verify property exists
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .in('id', testData.propertyIds);

    if (propertiesError) {
      throw new Error(`Database error: ${propertiesError.message}`);
    }

    if (properties.length !== testData.propertyIds.length) {
      throw new Error('Some property IDs are invalid');
    }

    // Calculate pricing
    const basePrice = 10.00;
    const property = properties[0];
    
    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Property Report: ${property.name}`,
          description: `Detailed rating report for ${property.address}`,
        },
        unit_amount: Math.round(basePrice * 100), // Convert to cents
      },
      quantity: 1,
    }];

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase')
      .insert({
        email: testData.email,
        customer_name: testData.customerName,
        total_amount: basePrice,
        status: 'pending',
        metadata: {
          property_count: 1,
          properties: [{ id: property.id, name: property.name }]
        }
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    // Create purchase item
    await supabase
      .from('purchase_item')
      .insert({
        purchase_id: purchase.id,
        property_id: property.id,
        unit_price: basePrice,
      });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      customer_email: testData.email,
      metadata: {
        purchase_id: purchase.id,
        customer_email: testData.email,
      },
    });

    // Update purchase with session ID
    await supabase
      .from('purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    console.log('✅ SUCCESS! Checkout created!');
    console.log('🔗 Checkout URL:', session.url);
    console.log('💰 Total Amount: $10.00');
    console.log('📊 Property Count: 1');
    
    // Send HTML response with the checkout URL
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stripe Checkout Success!</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 20px; border-radius: 10px; }
          .checkout-url { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all; }
          .btn { background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎉 SUCCESS! Stripe Checkout Created!</h1>
          <p><strong>💰 Total Amount:</strong> $10.00</p>
          <p><strong>📊 Property Count:</strong> 1</p>
          <p><strong>🆔 Session ID:</strong> ${session.id}</p>
          
          <div class="checkout-url">
            <strong>🔗 Checkout URL:</strong><br>
            <a href="${session.url}" target="_blank">${session.url}</a>
          </div>
          
          <a href="${session.url}" class="btn" target="_blank">🚀 Open Stripe Checkout</a>
          
          <h3>🎯 Next Steps:</h3>
          <ol>
            <li>Click the "Open Stripe Checkout" button above</li>
            <li>Use test card: <code>4242 4242 4242 4242</code></li>
            <li>Use any future date and any CVC (e.g., 12/25, 123)</li>
            <li>Complete the payment to test the full flow!</li>
          </ol>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).send(`
      <h1>❌ Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Check the terminal for more details.</p>
    `);
  }
});

const PORT = 3002; // Different port to avoid conflicts
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('🧪 Open this URL to test: http://localhost:3002/test-checkout');
  
  // Auto-open the test URL
  setTimeout(() => {
    console.log('🔗 Opening test page...');
    spawn('start', [`http://localhost:${PORT}/test-checkout`], { shell: true });
  }, 1000);
});
