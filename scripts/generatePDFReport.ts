#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generatePDFReport() {
  console.log('🏠 Generating Property Rating Report PDF\n');

  try {
    // Get a test property
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng')
      .limit(1);

    if (propertiesError || !properties || properties.length === 0) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    const testProperty = properties[0];
    console.log(`🎯 Generating report for: ${testProperty.name}`);

    // Get report data using the SQL functions
    console.log('📊 Fetching report data...');
    
    const [overallResult, weeklyResult, monthlyResult, logResult] = await Promise.all([
      supabase.rpc('get_overall_averages', { property_id_param: testProperty.id }),
      supabase.rpc('get_weekly_averages', { property_id_param: testProperty.id }),
      supabase.rpc('get_monthly_averages', { property_id_param: testProperty.id }),
      supabase.rpc('get_rating_log', { property_id_param: testProperty.id })
    ]);

    const overallData = overallResult.data || [];
    const weeklyData = weeklyResult.data || [];
    const monthlyData = monthlyResult.data || [];
    const ratingLog = logResult.data || [];

    console.log(`✅ Found ${overallData.length} overall ratings, ${weeklyData.length} weekly entries, ${ratingLog.length} log entries`);

    // Create print-optimized HTML
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Property Rating Report - ${testProperty.name}</title>
    <style>
        @page {
            size: A4;
            margin: 0.75in;
        }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            line-height: 1.4; 
            color: #333;
            font-size: 12px;
        }
        .header { 
            text-align: center;
            border-bottom: 3px solid #007AFF; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 {
            color: #007AFF;
            font-size: 24px;
            margin: 0 0 10px 0;
        }
        .property-info { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
            border-left: 4px solid #007AFF;
        }
        .property-info h2 {
            margin-top: 0;
            color: #007AFF;
            font-size: 16px;
        }
        .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
        }
        .section h2 { 
            color: #007AFF; 
            border-bottom: 2px solid #e9ecef; 
            padding-bottom: 8px;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .rating-grid { 
            display: flex;
            justify-content: space-between;
            gap: 15px; 
            margin: 20px 0;
        }
        .rating-card { 
            background: white; 
            border: 2px solid #e9ecef; 
            padding: 15px; 
            border-radius: 8px; 
            text-align: center;
            flex: 1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .rating-card h3 {
            margin: 0 0 8px 0;
            color: #495057;
            text-transform: capitalize;
            font-size: 14px;
        }
        .rating-value { 
            font-size: 20px; 
            font-weight: bold; 
            color: #007AFF;
            margin: 8px 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 11px;
        }
        th, td { 
            padding: 10px; 
            text-align: center; 
            border: 1px solid #dee2e6;
        }
        th { 
            background-color: #007AFF; 
            color: white;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .log-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        .log-item {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            padding: 6px;
            border-bottom: 1px solid #e9ecef;
            background: white;
            margin: 2px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 10px;
            border-top: 1px solid #e9ecef;
            padding-top: 15px;
        }
        .no-data {
            text-align: center; 
            color: #6c757d; 
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Property Rating Report</h1>
        <p style="font-size: 12px; color: #6c757d; margin: 0;">
            Generated on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} at ${new Date().toLocaleTimeString()}
        </p>
    </div>

    <div class="property-info">
        <h2>📍 Property Information</h2>
        <p><strong>Name:</strong> ${testProperty.name}</p>
        <p><strong>Address:</strong> ${testProperty.address}</p>
        <p><strong>Coordinates:</strong> ${testProperty.lat.toFixed(6)}, ${testProperty.lng.toFixed(6)}</p>
    </div>

    <div class="section">
        <h2>⭐ Overall Rating Summary</h2>
        ${overallData.length > 0 ? `
            <div class="rating-grid">
                ${overallData.map((rating: any) => `
                    <div class="rating-card">
                        <h3>${rating.attribute}</h3>
                        <div class="rating-value">${rating.avg_rating} ⭐</div>
                        <p style="margin: 0; color: #6c757d; font-size: 11px;">${rating.rating_count} total ratings</p>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="no-data">No ratings available for this property</div>'}
    </div>

    <div class="section">
        <h2>📈 Weekly Trends (Last 8 Weeks)</h2>
        ${weeklyData.length > 0 ? (() => {
            const weeklyGrouped = weeklyData.reduce((acc: any, item: any) => {
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
            
            return `
                <table>
                    <thead>
                        <tr>
                            <th>Week Starting</th>
                            <th>Noise</th>
                            <th>Friendliness</th>
                            <th>Cleanliness</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weeks.map((week: any) => `
                            <tr>
                                <td style="text-align: left; font-weight: 500;">
                                    ${new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </td>
                                <td>${week.noise ? `${week.noise.avg_rating} ⭐` : '-'}</td>
                                <td>${week.friendliness ? `${week.friendliness.avg_rating} ⭐` : '-'}</td>
                                <td>${week.cleanliness ? `${week.cleanliness.avg_rating} ⭐` : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        })() : '<div class="no-data">No weekly trend data available</div>'}
    </div>

    <div class="section">
        <h2>📊 Monthly Trends (Last 12 Months)</h2>
        ${monthlyData.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                ${monthlyData.map((month: any) => `
                    <div style="padding: 10px; border: 1px solid #e9ecef; border-radius: 6px; background: white;">
                        <strong>${new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}:</strong><br>
                        ${month.attribute} = ${month.avg_rating} ⭐ (${month.rating_count})
                    </div>
                `).join('')}
            </div>
        ` : '<div class="no-data">No monthly trend data available</div>'}
    </div>

    <div class="section">
        <h2>📝 Recent Rating Activity</h2>
        <div class="log-section">
            ${ratingLog.length > 0 ? ratingLog.slice(0, 15).map((log: any) => `
                <div class="log-item">
                    ${new Date(log.created_at).toLocaleDateString()} ${new Date(log.created_at).toLocaleTimeString()} - 
                    <strong>${log.attribute}</strong>: ${log.stars} ⭐ 
                    <span style="color: #6c757d;">(User: ${log.user_hash})</span>
                </div>
            `).join('') : '<div class="no-data">No rating history available</div>'}
        </div>
    </div>

    <div class="footer">
        <p>This report was generated automatically by the Property Ratings System.</p>
        <p>Report ID: ${testProperty.id} | Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
    `;

    // Save HTML file
    const fileName = `property-report-${testProperty.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
    const filePath = path.join(process.cwd(), fileName);
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    
    console.log(`\n✅ Report generated successfully!`);
    console.log(`📄 Property: ${testProperty.name}`);
    console.log(`📁 File saved: ${fileName}`);
    console.log(`📍 Full path: ${filePath}`);
    
    console.log(`\n🖨️  To convert to PDF:`);
    console.log(`1. Open the HTML file in your browser:`);
    console.log(`   start "${fileName}"`);
    console.log(`2. Press Ctrl+P to print`);
    console.log(`3. Select "Save as PDF"`);
    console.log(`4. Click Save`);
    
    console.log(`\n💡 Opening file in browser now...`);
    
    // Open the file in default browser
    const { exec } = require('child_process');
    exec(`start "${fileName}"`, (error: any) => {
      if (error) {
        console.log(`⚠️  Could not auto-open file. Please manually open: ${fileName}`);
      } else {
        console.log(`🌐 File opened in browser!`);
      }
    });

  } catch (error) {
    console.error('❌ Report generation failed:', error);
  }
}

generatePDFReport().catch(console.error);

