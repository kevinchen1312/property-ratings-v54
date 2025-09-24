// Test checkout with 3 DIFFERENT properties
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

// Test route for different properties checkout
app.get('/test-different-properties', async (req, res) => {
  try {
    console.log('🧪 Creating checkout with 3 DIFFERENT properties...');
    
    // Use 3 different property IDs
    const testData = {
      propertyIds: [
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7', // 10634 Merriman Road
        'deb251cc-166d-41c5-8efa-84abcd3b35a5', // 5866 W Walbrook Dr
        'b9b842ac-3d0c-4761-a3d9-297989d6996c'  // 5878 W Walbrook Dr
      ],
      email: 'multi-property@example.com',
      customerName: 'Multi Property Customer'
    };

    // Verify all properties exist
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .in('id', testData.propertyIds);

    if (propertiesError) {
      throw new Error(`Database error: ${propertiesError.message}`);
    }

    if (properties.length !== testData.propertyIds.length) {
      throw new Error(`Expected ${testData.propertyIds.length} properties, found ${properties.length}`);
    }

    console.log('✅ All properties found:');
    properties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.name} (${prop.address})`);
    });

    // Calculate progressive pricing for DIFFERENT properties
    const basePrice = 10.00;
    const discountPerProperty = 0.40;
    
    const lineItems = testData.propertyIds.map((propertyId, index) => {
      const property = properties.find(p => p.id === propertyId);
      const unitPrice = Math.max(basePrice - (index * discountPerProperty), 1.00);
      
      console.log(`   Property ${index + 1}: ${property.name} - $${unitPrice.toFixed(2)}`);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Property Report: ${property.name}`,
            description: `Rating report for ${property.address}`,
            metadata: {
              property_id: propertyId,
              property_name: property.name,
              order_position: index + 1,
            },
          },
          unit_amount: Math.round(unitPrice * 100), // Convert to cents
        },
        quantity: 1,
      };
    });

    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount / 100), 0);
    console.log(`💰 Total: $${totalAmount.toFixed(2)}`);

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
          different_properties: true,
          properties: properties.map((p, index) => ({
            id: p.id,
            name: p.name,
            position: index + 1,
            price: Math.max(basePrice - (index * discountPerProperty), 1.00)
          }))
        }
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    // Create purchase items for each different property
    const purchaseItems = testData.propertyIds.map((propertyId, index) => ({
      purchase_id: purchase.id,
      property_id: propertyId,
      unit_price: Math.max(basePrice - (index * discountPerProperty), 1.00),
    }));

    await supabase
      .from('purchase_item')
      .insert(purchaseItems);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://example.com/success?type=multi-property',
      cancel_url: 'https://example.com/cancel',
      customer_email: testData.email,
      metadata: {
        purchase_id: purchase.id,
        customer_email: testData.email,
        different_properties: 'true',
        property_count: testData.propertyIds.length.toString(),
      },
    });

    // Update purchase with session ID
    await supabase
      .from('purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    console.log('✅ SUCCESS! Multi-property checkout created!');
    
    // Send HTML response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Multi-Property Checkout Success!</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 20px; border-radius: 10px; }
          .checkout-url { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all; }
          .btn { background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .property-list { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .property-item { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎉 Multi-Property Checkout Created!</h1>
          
          <div class="property-list">
            <h3>🏠 Different Properties & Progressive Pricing:</h3>
            ${properties.map((property, index) => {
              const price = Math.max(basePrice - (index * discountPerProperty), 1.00);
              return `
                <div class="property-item">
                  <div>
                    <strong>${property.name}</strong><br>
                    <small>${property.address}</small>
                  </div>
                  <div style="text-align: right;">
                    <strong>$${price.toFixed(2)}</strong><br>
                    <small>${index === 0 ? 'Full Price' : `${((index * discountPerProperty / basePrice) * 100).toFixed(0)}% Off`}</small>
                  </div>
                </div>
              `;
            }).join('')}
            <div class="property-item total">
              <span><strong>Total Amount:</strong></span>
              <span><strong>$${totalAmount.toFixed(2)}</strong></span>
            </div>
          </div>
          
          <p><strong>📊 Property Count:</strong> ${testData.propertyIds.length} different properties</p>
          <p><strong>🆔 Session ID:</strong> ${session.id}</p>
          
          <div class="checkout-url">
            <strong>🔗 Checkout URL:</strong><br>
            <a href="${session.url}" target="_blank">${session.url}</a>
          </div>
          
          <a href="${session.url}" class="btn" target="_blank">🚀 Open Multi-Property Checkout</a>
          
          <h3>🎯 This Tests:</h3>
          <ul>
            <li>✅ 3 different properties (not duplicates)</li>
            <li>✅ Progressive pricing: $10.00 → $9.60 → $9.20</li>
            <li>✅ Separate line items for each property</li>
            <li>✅ Bulk discount logic for different properties</li>
            <li>✅ Database records for each property report</li>
          </ul>
          
          <h3>📋 In Stripe Checkout You'll See:</h3>
          <ul>
            <li><strong>Line 1:</strong> Property Report: 10634 Merriman Road - $10.00</li>
            <li><strong>Line 2:</strong> Property Report: House 5866 W Walbrook Dr - $9.60</li>
            <li><strong>Line 3:</strong> Property Report: House 5878 W Walbrook Dr - $9.20</li>
            <li><strong>Total:</strong> $28.80</li>
          </ul>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Multi-property checkout error:', error);
    res.status(500).send(`
      <h1>❌ Multi-Property Checkout Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Check the terminal for more details.</p>
    `);
  }
});

const PORT = 3004; // Different port
app.listen(PORT, () => {
  console.log(`🚀 Multi-property test server running on http://localhost:${PORT}`);
  console.log('🧪 Open this URL: http://localhost:3004/test-different-properties');
  
  // Auto-open the test URL
  setTimeout(() => {
    console.log('🔗 Opening multi-property test page...');
    spawn('start', [`http://localhost:${PORT}/test-different-properties`], { shell: true });
  }, 1000);
});
