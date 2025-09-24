// Quick test of the checkout endpoint
const https = require('https');
const http = require('http');

async function testCheckout() {
  console.log('🧪 Testing Checkout Endpoint\n');

  const testData = {
    propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'],
    email: 'test@example.com',
    customerName: 'Test Customer'
  };

  try {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/create-checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ SUCCESS! Checkout session created!');
            console.log('🔗 Checkout URL:', result.checkout_url);
            console.log('💰 Total Amount:', `$${result.total_amount}`);
            console.log('📊 Property Count:', result.property_count);
            console.log('🆔 Session ID:', result.session_id);
            console.log('\n🎯 Next: Open the checkout URL to test payment!');
          } else {
            console.log('❌ Checkout failed:', result.error);
            console.log('Details:', result.details);
          }
        } catch (parseError) {
          console.log('❌ Parse error:', parseError.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Connection error:', error.message);
      console.log('💡 Make sure the server is running on port 3001');
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.log('❌ Request error:', error.message);
  }
}

testCheckout().catch(console.error);
