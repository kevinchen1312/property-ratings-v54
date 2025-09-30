// Test if your Stripe key is working
// Run this in Node.js to test your Stripe key

const stripe = require('stripe')('sk_test_your_key_here'); // Replace with your actual key

async function testStripeKey() {
  try {
    console.log('🧪 Testing Stripe key...');
    
    // Simple test - try to list accounts (should work with any valid key)
    const accounts = await stripe.accounts.list({ limit: 1 });
    console.log('✅ Stripe key is valid!');
    console.log('📊 Account count:', accounts.data.length);
    
    // Test creating a Connect account
    console.log('🔗 Testing Connect account creation...');
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: 'test@example.com',
    });
    console.log('✅ Connect account created:', account.id);
    
    // Clean up - delete the test account
    await stripe.accounts.del(account.id);
    console.log('🗑️ Test account deleted');
    
  } catch (error) {
    console.error('❌ Stripe key test failed:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
  }
}

console.log(`
🔧 TO RUN THIS TEST:

1. Install stripe: npm install stripe
2. Replace 'sk_test_your_key_here' with your actual Stripe secret key
3. Run: node test-stripe-key.js

This will tell us if your Stripe key has the right permissions for Connect accounts.
`);

// Uncomment to run:
// testStripeKey();
