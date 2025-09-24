// Simple health check test
const http = require('http');

console.log('🏥 Testing Server Health...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is responding! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
    console.log('\n🎯 Server is working! Now testing checkout...');
    testCheckout();
  });
});

req.on('error', (error) => {
  console.log('❌ Health check failed:', error.message);
});

req.end();

function testCheckout() {
  console.log('\n🧪 Testing Checkout Creation...');
  
  const testData = JSON.stringify({
    propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'],
    email: 'test@example.com',
    customerName: 'Test Customer'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/create-checkout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Checkout Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log('\n🎉 SUCCESS! Stripe Checkout Created!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔗 Checkout URL:', result.checkout_url);
          console.log('💰 Total Amount:', `$${result.total_amount}`);
          console.log('📊 Property Count:', result.property_count);
          console.log('🆔 Session ID:', result.session_id);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('\n🎯 NEXT: Copy the checkout URL and open it in your browser!');
          console.log('💳 Use test card: 4242 4242 4242 4242');
        } else {
          console.log('❌ Checkout failed');
          console.log('Error:', result.error);
          if (result.details) console.log('Details:', result.details);
        }
      } catch (parseError) {
        console.log('❌ Parse error:', parseError.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Checkout request failed:', error.message);
  });

  req.write(testData);
  req.end();
}
