// Test script for checkout functionality
require('dotenv').config();

async function testCheckout() {
  console.log('🧪 Testing Checkout Functionality\n');

  const testData = {
    propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'], // Test property
    email: 'test@example.com',
    customerName: 'Test Customer'
  };

  try {
    const response = await fetch('http://localhost:3001/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Checkout session created successfully!');
      console.log('Checkout URL:', result.checkout_url);
      console.log('Session ID:', result.session_id);
      console.log('Total Amount:', `$${result.total_amount}`);
      console.log('Property Count:', result.property_count);
    } else {
      console.log('❌ Checkout failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Test multiple properties with bulk pricing
async function testBulkCheckout() {
  console.log('\\n🧪 Testing Bulk Checkout (3 properties)\n');

  const testData = {
    propertyIds: [
      '364607cd-69fb-4e8a-9b20-4ff4ce6758e7',
      '364607cd-69fb-4e8a-9b20-4ff4ce6758e7', // Duplicate for testing
      '364607cd-69fb-4e8a-9b20-4ff4ce6758e7'  // Duplicate for testing
    ],
    email: 'bulk@example.com',
    customerName: 'Bulk Customer'
  };

  try {
    const response = await fetch('http://localhost:3001/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Bulk checkout session created!');
      console.log('Expected pricing: $10.00 + $9.60 + $9.20 = $28.80');
      console.log('Actual total:', `$${result.total_amount}`);
    } else {
      console.log('❌ Bulk checkout failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Bulk test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('Starting server tests...\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3001/health');
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Start it with: npm run dev');
    return;
  }

  await testCheckout();
  await testBulkCheckout();
}

runTests().catch(console.error);

