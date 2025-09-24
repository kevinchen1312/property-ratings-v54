// Test bulk checkout with multiple properties
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

// Test route for bulk checkout
app.get('/test-bulk-checkout', async (req, res) => {
  try {
    console.log('🧪 Creating BULK checkout session (3 properties)...');
    
    // Test with 3 properties (using same property ID for testing)
    const testData = {
      propertyIds: [
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7',
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7',
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7'
      ],
      email: 'bulk-test@example.com',
      customerName: 'Bulk Test Customer'
    };

    // Verify properties exist
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .in('id', testData.propertyIds);

    if (propertiesError) {
      throw new Error(`Database error: ${propertiesError.message}`);
    }

    if (properties.length === 0) {
      throw new Error('No valid properties found');
    }

    // Calculate progressive pricing: $10.00, $9.60, $9.20, etc.
    const basePrice = 10.00;
    const discountPerItem = 0.40;
    
    const lineItems = testData.propertyIds.map((propertyId, index) => {
      const property = properties[0]; // Using same property for test
      const unitPrice = Math.max(basePrice - (index * discountPerItem), 1.00);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Property Report ${index + 1}: ${property.name}`,
            description: `Report for ${property.address} (Item ${index + 1})`,
            metadata: {
              property_id: propertyId,
              item_number: index + 1,
            },
          },
          unit_amount: Math.round(unitPrice * 100), // Convert to cents
        },
        quantity: 1,
      };
    });

    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount / 100), 0);

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase')
      .insert({
        email: testData.email,
        customer_name: testData.customerName,
        total_amount: totalAmount,
        status: 'pending',
        metadata: {
          property_count: testData.propertyIds.length,
          bulk_order: true,
          pricing_breakdown: lineItems.map((item, index) => ({
            item: index + 1,
            price: item.price_data.unit_amount / 100
          }))
        }
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    // Create purchase items
    const purchaseItems = testData.propertyIds.map((propertyId, index) => ({
      purchase_id: purchase.id,
      property_id: propertyId,
      unit_price: Math.max(basePrice - (index * discountPerItem), 1.00),
    }));

    await supabase
      .from('purchase_item')
      .insert(purchaseItems);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://example.com/success?bulk=true',
      cancel_url: 'https://example.com/cancel',
      customer_email: testData.email,
      metadata: {
        purchase_id: purchase.id,
        customer_email: testData.email,
        bulk_order: 'true',
        property_count: testData.propertyIds.length.toString(),
      },
    });

    // Update purchase with session ID
    await supabase
      .from('purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    console.log('✅ SUCCESS! Bulk checkout created!');
    console.log('🔗 Checkout URL:', session.url);
    console.log('💰 Expected Total: $28.80 ($10.00 + $9.60 + $9.20)');
    console.log('💰 Actual Total:', `$${totalAmount}`);
    console.log('📊 Property Count:', testData.propertyIds.length);
    
    // Send HTML response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Stripe Checkout Success!</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 20px; border-radius: 10px; }
          .checkout-url { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all; }
          .btn { background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .pricing { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .pricing-item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎉 SUCCESS! Bulk Stripe Checkout Created!</h1>
          
          <div class="pricing">
            <h3>💰 Progressive Pricing Breakdown:</h3>
            <div class="pricing-item">
              <span>Report 1 (${properties[0].name}):</span>
              <span>$10.00</span>
            </div>
            <div class="pricing-item">
              <span>Report 2 (${properties[0].name}):</span>
              <span>$9.60</span>
            </div>
            <div class="pricing-item">
              <span>Report 3 (${properties[0].name}):</span>
              <span>$9.20</span>
            </div>
            <div class="pricing-item total">
              <span><strong>Total Amount:</strong></span>
              <span><strong>$${totalAmount}</strong></span>
            </div>
          </div>
          
          <p><strong>📊 Property Count:</strong> ${testData.propertyIds.length}</p>
          <p><strong>🆔 Session ID:</strong> ${session.id}</p>
          
          <div class="checkout-url">
            <strong>🔗 Checkout URL:</strong><br>
            <a href="${session.url}" target="_blank">${session.url}</a>
          </div>
          
          <a href="${session.url}" class="btn" target="_blank">🚀 Open Bulk Checkout</a>
          
          <h3>🎯 Test the Bulk Purchase:</h3>
          <ol>
            <li>Click "Open Bulk Checkout" above</li>
            <li>You'll see <strong>3 separate line items</strong> with different prices</li>
            <li>Total should be <strong>$${totalAmount}</strong></li>
            <li>Use test card: <code>4242 4242 4242 4242</code></li>
            <li>Complete the payment to test bulk processing!</li>
          </ol>
          
          <h3>📋 This Tests:</h3>
          <ul>
            <li>✅ Progressive pricing (decreases by $0.40 per item)</li>
            <li>✅ Multiple line items in Stripe</li>
            <li>✅ Bulk purchase database records</li>
            <li>✅ Metadata for tracking</li>
          </ul>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Bulk checkout error:', error);
    res.status(500).send(`
      <h1>❌ Bulk Checkout Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Check the terminal for more details.</p>
    `);
  }
});

const PORT = 3003; // Different port
app.listen(PORT, () => {
  console.log(`🚀 Bulk test server running on http://localhost:${PORT}`);
  console.log('🧪 Open this URL: http://localhost:3003/test-bulk-checkout');
  
  // Auto-open the test URL
  setTimeout(() => {
    console.log('🔗 Opening bulk test page...');
    spawn('start', [`http://localhost:${PORT}/test-bulk-checkout`], { shell: true });
  }, 1000);
});
