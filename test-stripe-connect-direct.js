// Test the createStripeConnectAccount function directly to see detailed errors
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://leadsong.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlYWRzb25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY2OTY1NzUsImV4cCI6MjA0MjI3MjU3NX0.wJzOdJdmrpNJGnhKEQBxTdKJVEhqnNGhYnOJdmrpNJG';

async function testStripeConnect() {
  console.log('🧪 Testing createStripeConnectAccount function...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get current user session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session.session) {
      console.error('❌ Not authenticated:', sessionError);
      return;
    }
    
    console.log('✅ User authenticated:', session.session.user.email);
    
    // Call the createStripeConnectAccount function
    console.log('📞 Calling createStripeConnectAccount...');
    const { data, error } = await supabase.functions.invoke('createStripeConnectAccount', {
      body: {
        action: 'create'
      }
    });
    
    console.log('📊 Function Response:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
    
    if (error) {
      console.error('❌ Function Error Details:');
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Context:', error.context);
    } else if (data && data.error) {
      console.error('❌ Stripe Error Details:');
      console.error('  Error:', data.error);
      console.error('  Details:', data.details);
      console.error('  Stripe Error Type:', data.stripeError);
      console.error('  Stripe Code:', data.stripeCode);
      console.error('  Debug Info:', JSON.stringify(data.debugInfo, null, 2));
    } else {
      console.log('✅ Function Success:', data);
    }
    
  } catch (err) {
    console.error('❌ Test Error:', err);
  }
}

testStripeConnect();
