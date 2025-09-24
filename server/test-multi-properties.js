// Test with actual different properties from database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAvailableProperties() {
  console.log('🔍 Finding available properties in database...\n');
  
  try {
    const { data: properties, error } = await supabase
      .from('property')
      .select('id, name, address')
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    if (properties.length === 0) {
      console.log('❌ No properties found in database');
      return;
    }
    
    console.log(`✅ Found ${properties.length} properties:`);
    properties.forEach((property, index) => {
      console.log(`${index + 1}. ${property.name}`);
      console.log(`   Address: ${property.address}`);
      console.log(`   ID: ${property.id}`);
      console.log('');
    });
    
    // Take first 3 different properties for testing
    const testProperties = properties.slice(0, Math.min(3, properties.length));
    
    console.log('🧪 Creating test with these properties:');
    testProperties.forEach((property, index) => {
      const price = 10.00 - (index * 0.40);
      console.log(`   ${index + 1}. ${property.name} - $${price.toFixed(2)}`);
    });
    
    const total = testProperties.reduce((sum, _, index) => {
      return sum + (10.00 - (index * 0.40));
    }, 0);
    
    console.log(`\n💰 Total for ${testProperties.length} different properties: $${total.toFixed(2)}`);
    
    return testProperties;
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findAvailableProperties();
