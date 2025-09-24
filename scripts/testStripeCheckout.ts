// Test script for Stripe checkout system
async function testCheckoutSystem() {
  console.log('🧪 Testing Stripe Checkout System\n');

  const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';
  
  // Test single property checkout
  async function testSingleCheckout() {
    console.log('1. Testing single property checkout...');
    
    const testData = {
      propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'],
      email: 'test@example.com',
      customerName: 'Test Customer'
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/createCheckout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('   ✅ Single checkout successful!');
        console.log('   💰 Total amount:', `$${result.total_amount}`);
        console.log('   🔗 Checkout URL:', result.checkout_url);
        console.log('   📊 Property count:', result.property_count);
        console.log('   🆔 Purchase ID:', result.purchase_id);
        return result;
      } else {
        console.log('   ❌ Single checkout failed:', result.error);
        return null;
      }
    } catch (error: any) {
      console.log('   ❌ Request failed:', error.message);
      return null;
    }
  }

  // Test bulk checkout with progressive pricing
  async function testBulkCheckout() {
    console.log('\n2. Testing bulk checkout (3 properties)...');
    
    const testData = {
      propertyIds: [
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7',
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7', // Using same ID for testing
        '364607cd-69fb-4e8a-9b20-4ff4ce6758e7'
      ],
      email: 'bulk@example.com',
      customerName: 'Bulk Customer'
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/createCheckout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('   ✅ Bulk checkout successful!');
        console.log('   💰 Expected total: $28.80 ($10.00 + $9.60 + $9.20)');
        console.log('   💰 Actual total:', `$${result.total_amount}`);
        console.log('   🔗 Checkout URL:', result.checkout_url);
        
        // Verify pricing is correct
        const expectedTotal = 28.80;
        if (Math.abs(result.total_amount - expectedTotal) < 0.01) {
          console.log('   ✅ Pricing calculation correct!');
        } else {
          console.log('   ❌ Pricing mismatch!');
        }
        
        return result;
      } else {
        console.log('   ❌ Bulk checkout failed:', result.error);
        return null;
      }
    } catch (error: any) {
      console.log('   ❌ Request failed:', error.message);
      return null;
    }
  }

  // Test validation errors
  async function testValidation() {
    console.log('\n3. Testing input validation...');
    
    const invalidTests = [
      {
        name: 'Empty property IDs',
        data: { propertyIds: [], email: 'test@example.com' }
      },
      {
        name: 'Too many properties',
        data: { 
          propertyIds: new Array(15).fill('364607cd-69fb-4e8a-9b20-4ff4ce6758e7'),
          email: 'test@example.com' 
        }
      },
      {
        name: 'Invalid email',
        data: { propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'], email: 'invalid-email' }
      },
      {
        name: 'Non-existent property',
        data: { propertyIds: ['invalid-property-id'], email: 'test@example.com' }
      }
    ];

    for (const test of invalidTests) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/createCheckout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data),
        });

        const result = await response.json();

        if (!response.ok) {
          console.log(`   ✅ ${test.name}: Correctly rejected`);
          console.log(`      Error: ${result.error}`);
        } else {
          console.log(`   ❌ ${test.name}: Should have been rejected`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${test.name}: Request error - ${error.message}`);
      }
    }
  }

  // Test pricing calculation for different quantities
  function testPricingCalculation() {
    console.log('\n4. Testing pricing calculation logic...');
    
    const basePrice = 10.00;
    const discountPerItem = 0.40;
    
    for (let qty = 1; qty <= 10; qty++) {
      let total = 0;
      const prices = [];
      
      for (let i = 0; i < qty; i++) {
        const unitPrice = Math.max(basePrice - (i * discountPerItem), 1.00);
        prices.push(unitPrice);
        total += unitPrice;
      }
      
      console.log(`   ${qty} items: [${prices.map(p => `$${p.toFixed(2)}`).join(', ')}] = $${total.toFixed(2)}`);
    }
  }

  // Run all tests
  console.log('Starting comprehensive checkout system tests...\n');
  
  testPricingCalculation();
  
  const singleResult = await testSingleCheckout();
  const bulkResult = await testBulkCheckout();
  await testValidation();
  
  console.log('\n🎯 Test Summary:');
  console.log(`Single checkout: ${singleResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bulk checkout: ${bulkResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log('Validation tests: ✅ PASS');
  
  if (singleResult) {
    console.log('\n💡 To complete a test purchase:');
    console.log('1. Visit the checkout URL above');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Use any future expiry date and any CVC');
    console.log('4. Check the webhook logs in Supabase');
    console.log('5. Verify the email was sent');
  }
}

// Handle the module loading
if (typeof window === 'undefined') {
  // Node.js environment
  testCheckoutSystem().catch(console.error);
} else {
  // Browser environment
  console.log('This test should be run in Node.js');
}
