// Quick test of the redeemReports function
const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';

// You need to get this from your mobile app or Supabase dashboard
// For now, we'll just test if the function responds
async function testFunction() {
  console.log('Testing Supabase function...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/redeemReports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This will fail auth but we'll see if the function is reachable
        'Authorization': 'Bearer test'
      },
      body: JSON.stringify({
        propertyIds: ['test-id'],
        email: 'test@example.com'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFunction();


