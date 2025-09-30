// Test script for earnings withdrawal system
async function testEarningsWithdrawal() {
  console.log('🧪 Testing Earnings Withdrawal System...\n');

  const SUPABASE_REF = "oyphcjbickujybvbeame";
  
  // You'll need to replace this with a real user token
  const USER_TOKEN = "your_user_jwt_token_here";

  try {
    // Test 1: Check Stripe Connect status
    console.log('1️⃣ Testing Stripe Connect status check...');
    const statusResponse = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createStripeConnectAccount`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_TOKEN}`
      },
      body: JSON.stringify({ action: 'get_status', accountId: 'acct_test_123' }),
    });
    
    console.log('Status check response:', statusResponse.status);
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json();
      console.log('✅ Status check successful:', statusResult);
    } else {
      console.log('❌ Status check failed');
    }

    // Test 2: Create Stripe Connect account
    console.log('\n2️⃣ Testing Stripe Connect account creation...');
    const createResponse = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createStripeConnectAccount`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_TOKEN}`
      },
      body: JSON.stringify({ action: 'create' }),
    });
    
    console.log('Account creation response:', createResponse.status);
    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ Account creation successful:', createResult.success);
      console.log('Onboarding URL:', createResult.onboardingUrl?.substring(0, 50) + '...');
    } else {
      console.log('❌ Account creation failed');
    }

    // Test 3: Process payouts
    console.log('\n3️⃣ Testing payout processing...');
    const payoutResponse = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/processPayouts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'process_all' }),
    });
    
    console.log('Payout processing response:', payoutResponse.status);
    if (payoutResponse.ok) {
      const payoutResult = await payoutResponse.json();
      console.log('✅ Payout processing successful:', payoutResult);
    } else {
      console.log('❌ Payout processing failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Test completed!');
}

// Instructions for running the test
console.log(`
📋 INSTRUCTIONS FOR TESTING:

1. First, make sure you've deployed the Supabase functions:
   npx supabase functions deploy createStripeConnectAccount
   npx supabase functions deploy processPayouts

2. Set up your Stripe environment variables in Supabase:
   - STRIPE_SECRET_KEY (your Stripe secret key)
   - STRIPE_WEBHOOK_SECRET (if needed)

3. Get a user JWT token:
   - Log into your app
   - Check browser dev tools or app logs for the JWT token
   - Replace USER_TOKEN in this script

4. Run this test:
   node test-earnings-withdrawal.js

🔄 EARNINGS WITHDRAWAL FLOW:

1. User rates properties → earns money (stored in contributor_payouts table)
2. User connects bank account via Stripe Connect (createStripeConnectAccount function)
3. User requests payout → money transferred to their bank account (processPayouts function)
4. User sees payout history in the app

This is the REVERSE of your credit system:
- Credit system: User pays Stripe → gets credits → uses credits for reports
- Earnings system: User earns money → connects bank → receives money from Stripe

`);

// Uncomment to run the test (after setting up USER_TOKEN)
// testEarningsWithdrawal();
