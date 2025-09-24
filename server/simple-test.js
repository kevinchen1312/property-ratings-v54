// Simple test using just HTTP module
const http = require('http');

console.log('🧪 Testing Stripe Checkout System...\n');

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

console.log('📡 Sending request to http://localhost:3001/create-checkout...');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📬 Response received!\n');
    
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('🎉 SUCCESS! Stripe checkout session created!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔗 Checkout URL:', result.checkout_url);
        console.log('💰 Total Amount:', `$${result.total_amount}`);
        console.log('📊 Property Count:', result.property_count);
        console.log('🆔 Session ID:', result.session_id);
        console.log('🆔 Purchase ID:', result.purchase_id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Copy the checkout URL above');
        console.log('2. Open it in your browser');
        console.log('3. Use test card: 4242 4242 4242 4242');
        console.log('4. Use any future date and any CVC');
        console.log('5. Complete the payment to test the full flow!');
      } else {
        console.log('❌ Checkout failed');
        console.log('Error:', result.error);
        if (result.details) console.log('Details:', result.details);
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response');
      console.log('Parse error:', parseError.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection failed');
  console.log('Error:', error.message);
  console.log('\n💡 Make sure your server is running in another terminal:');
  console.log('   cd server && node server.js');
});

req.write(testData);
req.end();

// Add timeout
setTimeout(() => {
  console.log('\n⏰ Test completed');
}, 2000);

