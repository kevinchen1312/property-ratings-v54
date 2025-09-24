#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as fs from 'fs';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generatePrintReadyHTML() {
  console.log('📄 Generating Print-Ready HTML Report\n');

  try {
    // Get a test property
    const { data: properties } = await supabase
      .from('property')
      .select('id, name, address')
      .limit(1);

    if (!properties || properties.length === 0) {
      console.error('❌ No properties found');
      return;
    }

    const testProperty = properties[0];
    console.log(`🎯 Creating print-ready report for: ${testProperty.name}`);

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
      console.error('❌ Error generating report');
      return;
    }

    let htmlContent = await response.text();
    
    // Add print-specific CSS
    const printCSS = `
    <style media="print">
        body { margin: 0; }
        .section { page-break-inside: avoid; }
        table { page-break-inside: avoid; }
        @page { margin: 0.5in; }
    </style>
    `;
    
    htmlContent = htmlContent.replace('</head>', printCSS + '</head>');
    
    // Save the print-ready HTML
    const fileName = `property-report-print-${testProperty.id}.html`;
    fs.writeFileSync(fileName, htmlContent);

    console.log('✅ Print-ready HTML generated!');
    console.log(`📁 File saved as: ${fileName}`);
    console.log('\n📋 To convert to PDF:');
    console.log('1. Open the file in your browser');
    console.log('2. Press Ctrl+P (or Cmd+P)');
    console.log('3. Select "Save as PDF" as destination');
    console.log('4. Click Save');
    
    // Try to open it automatically
    console.log('\n🌐 Opening file in browser...');
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

generatePrintReadyHTML().catch(console.error);

