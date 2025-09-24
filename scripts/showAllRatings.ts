#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showAllRatings() {
  console.log('📊 SHOWING ALL RATINGS DATA\n');

  const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';

  try {
    // Get ALL ratings from the table
    const { data: allRatings, error: allError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Query failed:', allError);
      return;
    }

    console.log(`📈 TOTAL RATINGS IN DATABASE: ${allRatings?.length || 0}`);
    
    if (allRatings && allRatings.length > 0) {
      // Show date range
      const newest = new Date(allRatings[0].created_at);
      const oldest = new Date(allRatings[allRatings.length - 1].created_at);
      
      console.log(`📅 DATE RANGE: ${oldest.toLocaleDateString()} to ${newest.toLocaleDateString()}`);
      
      // Group by month to show distribution
      const monthlyCount = allRatings.reduce((acc: any, rating: any) => {
        const month = new Date(rating.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 RATINGS BY MONTH:');
      Object.entries(monthlyCount).forEach(([month, count]) => {
        console.log(`  ${month}: ${count} ratings`);
      });

      console.log('\n📝 ALL RATINGS (first 30):');
      console.log('=====================================');
      allRatings.slice(0, 30).forEach((rating: any, index: number) => {
        const date = new Date(rating.created_at).toLocaleDateString();
        const time = new Date(rating.created_at).toLocaleTimeString();
        console.log(`${index + 1}. ${date} ${time} - ${rating.attribute}: ${rating.stars} stars`);
      });

      if (allRatings.length > 30) {
        console.log(`... and ${allRatings.length - 30} more entries`);
      }
    }

    // Now check what the function returns
    console.log('\n🔍 WHAT get_rating_log FUNCTION RETURNS:');
    console.log('=====================================');
    
    const { data: functionResult, error: funcError } = await supabase.rpc('get_rating_log', {
      property_id_param: propertyId
    });

    if (funcError) {
      console.error('❌ Function failed:', funcError);
    } else {
      console.log(`📋 Function returned: ${functionResult?.length || 0} entries`);
      
      if (functionResult && functionResult.length > 0) {
        const funcNewest = new Date(functionResult[0].created_at);
        const funcOldest = new Date(functionResult[functionResult.length - 1].created_at);
        console.log(`📅 Function date range: ${funcOldest.toLocaleDateString()} to ${funcNewest.toLocaleDateString()}`);
        
        console.log('\nFirst 10 from function:');
        functionResult.slice(0, 10).forEach((log: any, index: number) => {
          const date = new Date(log.created_at).toLocaleDateString();
          const time = new Date(log.created_at).toLocaleTimeString();
          console.log(`${index + 1}. ${date} ${time} - ${log.attribute}: ${log.stars} stars`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

showAllRatings().catch(console.error);

