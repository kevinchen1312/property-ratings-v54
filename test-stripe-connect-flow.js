// Test script for Stripe Connect payout flow
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestPayouts() {
  try {
    console.log('🧪 Creating test pending payouts...');
    
    // Get current user (you'll need to replace this with your actual user ID)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error getting users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found. Please sign up in your app first.');
      return;
    }
    
    const testUser = users[0]; // Use the first user
    console.log('👤 Using test user:', testUser.email);
    
    // Create a test revenue distribution record first
    const { data: revenueDistribution, error: revenueError } = await supabase
      .from('revenue_distribution')
      .insert({
        purchase_id: 'test-purchase-' + Date.now(),
        property_id: '364607cd-69fb-4e8a-9b20-4ff4ce6758e7', // Merriman Road property
        total_revenue: 10.00,
        platform_share: 8.00,
        top_contributor_share: 1.00,
        other_contributors_share: 1.00,
        top_contributor_id: testUser.id,
        top_contributor_rating_count: 5
      })
      .select()
      .single();
    
    if (revenueError) {
      console.error('Error creating revenue distribution:', revenueError);
      return;
    }
    
    console.log('💰 Created revenue distribution:', revenueDistribution.id);
    
    // Create test pending payouts
    const testPayouts = [
      {
        revenue_distribution_id: revenueDistribution.id,
        user_id: testUser.id,
        payout_amount: 1.50, // $1.50 - above minimum
        rating_count: 5,
        is_top_contributor: true,
        status: 'pending'
      },
      {
        revenue_distribution_id: revenueDistribution.id,
        user_id: testUser.id,
        payout_amount: 2.25, // $2.25 - another test payout
        rating_count: 3,
        is_top_contributor: false,
        status: 'pending'
      }
    ];
    
    const { data: payouts, error: payoutsError } = await supabase
      .from('contributor_payouts')
      .insert(testPayouts)
      .select();
    
    if (payoutsError) {
      console.error('Error creating test payouts:', payoutsError);
      return;
    }
    
    console.log('✅ Created test payouts:');
    payouts.forEach(payout => {
      console.log(`  - $${payout.payout_amount} (${payout.is_top_contributor ? 'Top Contributor' : 'Regular'})`);
    });
    
    console.log(`\n🎯 Total pending: $${payouts.reduce((sum, p) => sum + p.payout_amount, 0)}`);
    console.log('\n📱 Now go to your app\'s Earnings screen to see these payouts!');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

async function checkStripeConnectStatus() {
  try {
    console.log('🔍 Checking Stripe Connect status...');
    
    const { data: accounts, error } = await supabase
      .from('user_stripe_accounts')
      .select('*');
    
    if (error) {
      console.error('Error checking accounts:', error);
      return;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('📋 No Stripe Connect accounts found yet.');
      console.log('💡 Go to Earnings screen and click "Connect Bank Account" to create one.');
    } else {
      console.log('🏦 Stripe Connect accounts:');
      accounts.forEach(account => {
        console.log(`  - User: ${account.user_id.slice(0, 8)}...`);
        console.log(`    Status: ${account.account_status}`);
        console.log(`    Payouts Enabled: ${account.payouts_enabled ? '✅' : '❌'}`);
        console.log(`    Stripe ID: ${account.stripe_account_id}`);
      });
    }
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
}

async function testPayoutProcessing() {
  try {
    console.log('💸 Testing payout processing...');
    
    // Call the processPayouts Edge Function
    const response = await fetch('https://oyphcjbickujybvbeame.functions.supabase.co/processPayouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Payout processing result:', result);
    } else {
      console.error('❌ Payout processing failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Payout test failed:', error);
  }
}

// Main menu
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create-payouts':
      await createTestPayouts();
      break;
    case 'check-status':
      await checkStripeConnectStatus();
      break;
    case 'process-payouts':
      await testPayoutProcessing();
      break;
    default:
      console.log('🧪 Stripe Connect Test Commands:');
      console.log('  node test-stripe-connect-flow.js create-payouts   - Create test pending payouts');
      console.log('  node test-stripe-connect-flow.js check-status     - Check Stripe Connect accounts');
      console.log('  node test-stripe-connect-flow.js process-payouts  - Test payout processing');
      console.log('\n💡 Start with "create-payouts" to set up test data!');
  }
}

if (require.main === module) {
  main();
}
