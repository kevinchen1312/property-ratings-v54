#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showExactDataComparison() {
  console.log('📋 EXACT DATA COMPARISON: Supabase vs PDF Report\n');

  const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';

  try {
    // Get the exact data that will appear in the PDF
    const [overallResult, weeklyResult, monthlyResult, logResult] = await Promise.all([
      supabase.rpc('get_overall_averages', { property_id_param: propertyId }),
      supabase.rpc('get_weekly_averages', { property_id_param: propertyId }),
      supabase.rpc('get_monthly_averages', { property_id_param: propertyId }),
      supabase.rpc('get_rating_log', { property_id_param: propertyId })
    ]);

    console.log('==================================================');
    console.log('📊 OVERALL RATINGS (PDF Section 1)');
    console.log('==================================================');
    if (overallResult.data) {
      overallResult.data.forEach((rating: any) => {
        console.log(`${rating.attribute}: ${rating.avg_rating} stars (${rating.rating_count} ratings)`);
      });
    }

    console.log('\n==================================================');
    console.log('📈 WEEKLY TRENDS (PDF Section 2)');
    console.log('==================================================');
    if (weeklyResult.data) {
      console.log(`Found ${weeklyResult.data.length} weekly entries:`);
      
      // Group by week like the PDF does
      const weeklyGrouped = weeklyResult.data.reduce((acc: any, item: any) => {
        const weekKey = item.week_start;
        if (!acc[weekKey]) {
          acc[weekKey] = { week_start: weekKey, noise: null, friendliness: null, cleanliness: null };
        }
        acc[weekKey][item.attribute] = { avg_rating: item.avg_rating, rating_count: item.rating_count };
        return acc;
      }, {});
      
      const weeks = Object.values(weeklyGrouped).sort((a: any, b: any) => 
        new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      );
      
      weeks.slice(0, 10).forEach((week: any) => {
        const weekDate = new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const noise = week.noise ? `${week.noise.avg_rating}` : '-';
        const friendliness = week.friendliness ? `${week.friendliness.avg_rating}` : '-';
        const cleanliness = week.cleanliness ? `${week.cleanliness.avg_rating}` : '-';
        console.log(`${weekDate}: Noise=${noise}, Friendliness=${friendliness}, Cleanliness=${cleanliness}`);
      });
    }

    console.log('\n==================================================');
    console.log('📊 MONTHLY TRENDS (PDF Section 3)');
    console.log('==================================================');
    if (monthlyResult.data) {
      console.log(`Found ${monthlyResult.data.length} monthly entries:`);
      monthlyResult.data.forEach((month: any) => {
        const monthStr = new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        console.log(`${monthStr}: ${month.attribute} = ${month.avg_rating} stars (${month.rating_count} ratings)`);
      });
    }

    console.log('\n==================================================');
    console.log('📝 RECENT ACTIVITY LOG (PDF Section 4)');
    console.log('==================================================');
    if (logResult.data) {
      console.log(`Found ${logResult.data.length} total log entries.`);
      console.log('First 15 entries (what appears in PDF):');
      logResult.data.slice(0, 15).forEach((log: any, index: number) => {
        const logDate = new Date(log.created_at).toLocaleDateString();
        const logTime = new Date(log.created_at).toLocaleTimeString();
        console.log(`${index + 1}. ${logDate} ${logTime} - ${log.attribute}: ${log.stars} stars (User: ${log.user_hash})`);
      });
    }

    console.log('\n==================================================');
    console.log('✅ VERIFICATION INSTRUCTIONS');
    console.log('==================================================');
    console.log('1. Generate a new PDF: npm run generate:pdf');
    console.log('2. Open the PDF and compare each section above');
    console.log('3. The PDF should show EXACTLY the data listed above');
    console.log('4. If it matches, your report is working perfectly!');
    console.log('5. The dates should match your Supabase table exactly');

  } catch (error) {
    console.error('❌ Data comparison failed:', error);
  }
}

showExactDataComparison().catch(console.error);

