#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as fs from 'fs';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testHTMLReport() {
  console.log('🧪 Testing HTML Property Report Generation\n');

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

    // Call the HTML report function
    const functionUrl = `${supabaseUrl}/functions/v1/generatePropertyReportHTML`;

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

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ HTML Report error:', error);
      return;
    }

    const htmlContent = await response.text();
    
    // Save the HTML report to a file
    const fileName = `property-report-${testProperty.id}.html`;
    fs.writeFileSync(fileName, htmlContent);

    console.log('✅ HTML Report generated successfully!');
    console.log(`📄 Property: ${testProperty.name}`);
    console.log(`📁 File saved as: ${fileName}`);
    console.log(`🌐 You can open this file in your browser to view the report`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHTMLReport().catch(console.error);

