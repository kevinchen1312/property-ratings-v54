// Test the processPayouts function directly to see the exact error
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://leadsong.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlYWRzb25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY2OTY1NzUsImV4cCI6MjA0MjI3MjU3NX0.wJzOdJdmrpNJGnhKEQBxTdKJVEhqnNGhYnOJdmrpNJG';

async function testPayoutFunction() {
  console.log('🧪 Testing processPayouts function directly...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get current user session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session.session) {
      console.error('❌ Not authenticated:', sessionError);
      return;
    }
    
    console.log('✅ User authenticated:', session.session.user.email);
    
    // Call the processPayouts function
    const { data, error } = await supabase.functions.invoke('processPayouts', {
      body: {
        action: 'process_user',
        userId: session.session.user.id
      }
    });
    
    console.log('📊 Function Response:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
    
    if (error) {
      console.error('❌ Function Error Details:', error);
    } else {
      console.log('✅ Function Success:', data);
    }
    
  } catch (err) {
    console.error('❌ Test Error:', err);
  }
}

testPayoutFunction();
