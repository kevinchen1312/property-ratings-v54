// Simple test for Stripe Connect function
async function testStripeConnect() {
  try {
    console.log('🧪 Testing Stripe Connect function...');
    
    // You'll need to replace this with your actual JWT token
    const USER_TOKEN = "your_jwt_token_here";
    
    const response = await fetch('https://oyphcjbickujybvbeame.functions.supabase.co/createStripeConnectAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_TOKEN}`
      },
      body: JSON.stringify({ action: 'create' }),
    });
    
    console.log('📊 Response status:', response.status);
    
    const result = await response.text();
    console.log('📋 Response body:', result);
    
    if (response.ok) {
      const parsed = JSON.parse(result);
      console.log('✅ Success!');
      console.log('🔗 Onboarding URL:', parsed.onboardingUrl);
    } else {
      console.log('❌ Error response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log(`
🔧 TO RUN THIS TEST:

1. Get your JWT token:
   - Open browser dev tools in your app
   - Look for network requests with Authorization header
   - Copy the Bearer token (starts with "eyJ...")

2. Replace USER_TOKEN above with your actual token

3. Run: node test-stripe-connect-simple.js

OR check the Supabase function logs for errors!
`);

// Uncomment to run (after adding your token):
// testStripeConnect();
