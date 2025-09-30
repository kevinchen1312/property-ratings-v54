/**
 * Test Stripe Connect Flow
 * 
 * This script tests the complete Stripe Connect integration:
 * 1. Create Stripe Connect account
 * 2. Check account status
 * 3. Create login link
 * 4. Simulate payout processing
 * 
 * Usage: node test-stripe-connect-flow.js
 */

const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwOTE3NTcsImV4cCI6MjA1MzY2Nzc1N30.hxQZBdQlOWAVDGqS3G4FH3YCX9YnrjB3y1cKdSL5lD4';

// You need to get a valid access token from your app
// Login first, then copy the token from localStorage or session
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Please provide an access token as argument');
  console.error('Usage: node test-stripe-connect-flow.js YOUR_ACCESS_TOKEN');
  console.error('\nTo get your token:');
  console.error('1. Login to the app');
  console.error('2. Open browser console');
  console.error('3. Run: localStorage.getItem("supabase.auth.token")');
  console.error('4. Copy the access_token value');
  process.exit(1);
}

async function testCreateAccount() {
  console.log('\n🧪 Test 1: Create Stripe Connect Account\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/createStripeConnectAccount`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create' }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Failed to create account:', result);
    return null;
  }

  console.log('✅ Account created successfully!');
  console.log('   Account ID:', result.accountId);
  console.log('   Onboarding URL:', result.onboardingUrl);
  console.log('   Message:', result.message);

  return result.accountId;
}

async function testGetStatus(accountId) {
  console.log('\n🧪 Test 2: Get Account Status\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/createStripeConnectAccount`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      action: 'get_status',
      accountId: accountId
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Failed to get status:', result);
    return;
  }

  console.log('✅ Account status retrieved!');
  console.log('   Details submitted:', result.account.details_submitted);
  console.log('   Charges enabled:', result.account.charges_enabled);
  console.log('   Payouts enabled:', result.account.payouts_enabled);
  console.log('   Requirements:', result.account.requirements);
}

async function testLoginLink(accountId) {
  console.log('\n🧪 Test 3: Create Login Link\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/createStripeConnectAccount`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      action: 'create_login_link',
      accountId: accountId
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Failed to create login link:', result);
    return;
  }

  console.log('✅ Login link created!');
  console.log('   URL:', result.loginUrl);
  console.log('   Message:', result.message);
}

async function testProcessPayout() {
  console.log('\n🧪 Test 4: Process Payout\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/processPayouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const result = await response.json();

  if (!response.ok && result.error !== 'NO_STRIPE_ACCOUNT') {
    console.error('❌ Failed to process payout:', result);
    return;
  }

  if (result.error === 'NO_STRIPE_ACCOUNT') {
    console.log('⚠️ No Stripe account connected yet (expected for first run)');
    console.log('   Complete the onboarding first, then retry');
    return;
  }

  if (result.totalPayouts === 0) {
    console.log('ℹ️ No pending payouts to process');
    console.log('   This is normal if you haven\'t earned any money yet');
    return;
  }

  console.log('✅ Payout processed!');
  console.log('   Total payouts:', result.totalPayouts);
  console.log('   Successful:', result.successfulPayouts);
  console.log('   Failed:', result.failedPayouts);
  console.log('   Total amount: $' + result.totalAmount.toFixed(2));
  console.log('   Transfer ID:', result.transferId);
}

async function checkDatabaseStatus() {
  console.log('\n🧪 Test 5: Check Database Status\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_stripe_accounts?select=*`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });

  const accounts = await response.json();

  if (!response.ok) {
    console.error('❌ Failed to fetch accounts:', accounts);
    return;
  }

  if (accounts.length === 0) {
    console.log('ℹ️ No Stripe accounts found in database');
    return;
  }

  console.log('✅ Found Stripe account in database:');
  accounts.forEach(account => {
    console.log('   - Account ID:', account.stripe_account_id);
    console.log('   - Status:', account.account_status);
    console.log('   - Payouts enabled:', account.payouts_enabled);
    console.log('   - Created:', new Date(account.created_at).toLocaleString());
  });
}

async function runAllTests() {
  console.log('🚀 Starting Stripe Connect Integration Tests\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create account
    const accountId = await testCreateAccount();

    if (!accountId) {
      console.log('\n⚠️ Account creation failed or account already exists');
      console.log('Continuing with status checks...\n');
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Check database
    await checkDatabaseStatus();

    // Get account ID from database if creation failed
    let testAccountId = accountId;
    if (!testAccountId) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_stripe_accounts?select=stripe_account_id&limit=1`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });
      const accounts = await response.json();
      if (accounts && accounts.length > 0) {
        testAccountId = accounts[0].stripe_account_id;
      }
    }

    if (testAccountId) {
      // Test 2: Get status
      await testGetStatus(testAccountId);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: Create login link
      await testLoginLink(testAccountId);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Process payout
    await testProcessPayout();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');

    console.log('📝 Next Steps:');
    console.log('1. If account was created, complete the onboarding at the URL above');
    console.log('2. Create some test earnings (see STRIPE-CONNECT-DEPLOYMENT-GUIDE.md)');
    console.log('3. Request a payout from the app');
    console.log('4. Check Stripe Dashboard to see the transfer\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runAllTests();