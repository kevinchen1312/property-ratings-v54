#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailReport() {
  console.log('📧 Testing Email-Based Property Report Generation\n');

  try {
    // Get a test property
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .limit(1);

    if (propertiesError || !properties || properties.length === 0) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    const testProperty = properties[0];
    console.log(`🎯 Testing with property: ${testProperty.name}`);

    // Check existing ratings
    const { data: ratings } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', testProperty.id)
      .limit(5);

    console.log(`📊 Found ${ratings?.length || 0} ratings for this property`);

    // Test email address
    const testEmail = 'user@example.com';
    console.log(`📧 Test email address: ${testEmail}`);

    // Call the email report function
    console.log('\n🚀 Calling emailPropertyReport Edge Function...');

    const functionUrl = `${supabaseUrl}/functions/v1/emailPropertyReport`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        propertyId: testProperty.id,
        userEmail: testEmail
      })
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error('❌ Email Report error:', result);
      return;
    }

    console.log('✅ Email Report function executed successfully!');
    console.log(`📄 Property: ${result.property}`);
    console.log(`📧 Target email: ${result.userEmail}`);
    console.log(`🔗 HTML Preview: ${result.htmlUrl}`);
    console.log(`📝 Status: ${result.message}`);
    console.log(`💡 Note: ${result.note}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up PDF conversion service (htmlcsstoimage.com, etc.)');
    console.log('2. Set up email service (SendGrid, Resend, etc.)');
    console.log('3. Add email delivery functionality');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailReport().catch(console.error);

