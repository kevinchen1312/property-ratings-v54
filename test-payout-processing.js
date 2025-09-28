// Simple test for payout processing
async function testPayoutProcessing() {
  try {
    console.log('💸 Testing payout processing...');
    
    const response = await fetch('https://oyphcjbickujybvbeame.functions.supabase.co/processPayouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Payout processing completed!');
      if (result.successfulPayouts > 0) {
        console.log(`💰 Successfully processed ${result.successfulPayouts} payouts`);
        console.log(`💵 Total amount: $${result.totalAmount}`);
      }
      if (result.failedPayouts > 0) {
        console.log(`❌ Failed payouts: ${result.failedPayouts}`);
      }
    } else {
      console.log('❌ Payout processing failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPayoutProcessing();
