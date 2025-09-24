#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPDFReport() {
  console.log('📄 Testing Direct PDF Report Generation\n');

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

    // Call the PDF generation function
    console.log('\n🚀 Calling generatePropertyReportPDF Edge Function...');

    const functionUrl = `${supabaseUrl}/functions/v1/generatePropertyReportPDF`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        propertyId: testProperty.id
      })
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error('❌ PDF Generation error:', result);
      return;
    }

    console.log('✅ PDF Report generated successfully!');
    console.log(`📄 Property: ${result.property}`);
    console.log(`🔗 PDF URL: ${result.reportUrl}`);
    console.log(`📁 File name: ${result.fileName}`);
    console.log(`⏰ Expires at: ${result.expiresAt}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 You can download the PDF report using the URL above');
    console.log('💡 The URL will be valid for 7 days');
    console.log('💡 The PDF is stored in your Supabase Storage bucket');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPDFReport().catch(console.error);

