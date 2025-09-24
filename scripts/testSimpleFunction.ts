#!/usr/bin/env ts-node

import fetch from 'node-fetch';

async function testSimpleFunction() {
  console.log('🧪 Testing Simple Edge Function\n');

  try {
    const functionUrl = `https://oyphcjbickujybvbeame.supabase.co/functions/v1/test-simple`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc`,
      },
      body: JSON.stringify({
        propertyId: 'test-123'
      })
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error('❌ Simple function error:', result);
      return;
    }

    console.log('✅ Simple function works!');
    console.log('📄 Response:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleFunction().catch(console.error);

