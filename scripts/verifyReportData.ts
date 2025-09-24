#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyReportData() {
  console.log('🔍 Verifying Report Data Against Database\n');

  try {
    // Get the test property
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('name', '10634 Merriman Road')
      .single();

    if (propertiesError || !properties) {
      console.error('❌ Property not found:', propertiesError);
      return;
    }

    console.log('🏠 PROPERTY INFORMATION:');
    console.log(`   ID: ${properties.id}`);
    console.log(`   Name: ${properties.name}`);
    console.log(`   Address: ${properties.address}`);
    console.log(`   Coordinates: ${properties.lat}, ${properties.lng}\n`);

    // Check overall ratings
    const { data: overallData } = await supabase.rpc('get_overall_averages', {
      property_id_param: properties.id
    });

    console.log('⭐ OVERALL RATINGS:');
    if (overallData && overallData.length > 0) {
      overallData.forEach((rating: any) => {
        console.log(`   ${rating.attribute}: ${rating.avg_rating} stars (${rating.rating_count} ratings)`);
      });
    } else {
      console.log('   No overall ratings found');
    }
    console.log('');

    // Check weekly trends
    const { data: weeklyData } = await supabase.rpc('get_weekly_averages', {
      property_id_param: properties.id
    });

    console.log('📈 WEEKLY TRENDS:');
    if (weeklyData && weeklyData.length > 0) {
      console.log(`   Found ${weeklyData.length} weekly entries`);
      
      // Group by week
      const weeklyGrouped = weeklyData.reduce((acc: any, item: any) => {
        const weekKey = item.week_start;
        if (!acc[weekKey]) {
          acc[weekKey] = { week_start: weekKey, entries: [] };
        }
        acc[weekKey].entries.push(`${item.attribute}: ${item.avg_rating}`);
        return acc;
      }, {});
      
      const weeks = Object.values(weeklyGrouped).sort((a: any, b: any) => 
        new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      );
      
      weeks.slice(0, 5).forEach((week: any) => {
        const weekDate = new Date(week.week_start).toLocaleDateString();
        console.log(`   ${weekDate}: ${week.entries.join(', ')}`);
      });
    } else {
      console.log('   No weekly trends found');
    }
    console.log('');

    // Check monthly trends
    const { data: monthlyData } = await supabase.rpc('get_monthly_averages', {
      property_id_param: properties.id
    });

    console.log('📊 MONTHLY TRENDS:');
    if (monthlyData && monthlyData.length > 0) {
      console.log(`   Found ${monthlyData.length} monthly entries`);
      monthlyData.slice(0, 5).forEach((month: any) => {
        const monthStr = new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        console.log(`   ${monthStr}: ${month.attribute} = ${month.avg_rating} (${month.rating_count} ratings)`);
      });
    } else {
      console.log('   No monthly trends found');
    }
    console.log('');

    // Check rating log
    const { data: ratingLog } = await supabase.rpc('get_rating_log', {
      property_id_param: properties.id
    });

    console.log('📝 RECENT ACTIVITY LOG:');
    if (ratingLog && ratingLog.length > 0) {
      console.log(`   Found ${ratingLog.length} total log entries`);
      ratingLog.slice(0, 5).forEach((log: any) => {
        const logDate = new Date(log.created_at).toLocaleDateString();
        console.log(`   ${logDate}: ${log.attribute} = ${log.stars} stars (User: ${log.user_hash})`);
      });
    } else {
      console.log('   No activity log found');
    }
    console.log('');

    // Raw rating count verification
    const { data: rawRatings, error: rawError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', properties.id);

    console.log('🔢 RAW DATA VERIFICATION:');
    console.log(`   Total ratings in database: ${rawRatings?.length || 0}`);
    
    if (rawRatings && rawRatings.length > 0) {
      const attributeCounts = rawRatings.reduce((acc: any, rating: any) => {
        acc[rating.attribute] = (acc[rating.attribute] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(attributeCounts).forEach(([attr, count]) => {
        console.log(`   ${attr}: ${count} individual ratings`);
      });
    }

    console.log('\n✅ Data verification complete!');
    console.log('💡 This data should match exactly what appears in your PDF report.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyReportData().catch(console.error);

