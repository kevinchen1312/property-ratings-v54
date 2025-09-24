#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTimestamps() {
  console.log('🕐 DEBUGGING TIMESTAMP CONVERSION\n');

  const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';

  try {
    // Get raw ratings directly from the table
    const { data: rawRatings, error: rawError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (rawError) {
      console.error('❌ Raw query failed:', rawError);
      return;
    }

    console.log('📊 RAW DATABASE TIMESTAMPS (first 10):');
    console.log('=====================================');
    rawRatings?.forEach((rating: any, index: number) => {
      console.log(`${index + 1}. ${rating.created_at} - ${rating.attribute}: ${rating.stars} stars`);
    });

    // Get data from the function
    const { data: logResult, error: logError } = await supabase.rpc('get_rating_log', {
      property_id_param: propertyId
    });

    if (logError) {
      console.error('❌ Function query failed:', logError);
      return;
    }

    console.log('\n📊 FUNCTION OUTPUT (first 10):');
    console.log('=====================================');
    logResult?.slice(0, 10).forEach((log: any, index: number) => {
      console.log(`${index + 1}. ${log.created_at} - ${log.attribute}: ${log.stars} stars`);
    });

    console.log('\n🔍 TIMESTAMP CONVERSION ANALYSIS:');
    console.log('=====================================');
    if (rawRatings && logResult) {
      for (let i = 0; i < Math.min(5, rawRatings.length); i++) {
        const raw = rawRatings[i];
        const func = logResult[i];
        
        console.log(`\nEntry ${i + 1}:`);
        console.log(`  Raw DB: ${raw.created_at}`);
        console.log(`  Function: ${func.created_at}`);
        console.log(`  JS Date from raw: ${new Date(raw.created_at)}`);
        console.log(`  JS Date from func: ${new Date(func.created_at)}`);
        console.log(`  PDF would show: ${new Date(func.created_at).toLocaleDateString()} ${new Date(func.created_at).toLocaleTimeString()}`);
      }
    }

    console.log('\n🎯 EXPECTED PDF TIMESTAMPS:');
    console.log('=====================================');
    logResult?.slice(0, 15).forEach((log: any, index: number) => {
      const jsDate = new Date(log.created_at);
      const pdfDate = jsDate.toLocaleDateString();
      const pdfTime = jsDate.toLocaleTimeString();
      console.log(`${index + 1}. ${pdfDate} ${pdfTime} - ${log.attribute}: ${log.stars} stars`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTimestamps().catch(console.error);

