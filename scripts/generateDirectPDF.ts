#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateDirectPDF() {
  console.log('📄 Generating Property Rating Report PDF (Direct)\n');

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
    console.log(`🎯 Generating PDF for: ${testProperty.name}`);

    // Get ALL ratings directly from the table for accuracy
    console.log('📊 Fetching raw rating data...');
    
    const { data: allRatings, error: ratingsError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', testProperty.id)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('❌ Failed to get ratings:', ratingsError);
      return;
    }

    // Calculate averages manually from raw data
    const overallData: any[] = [];
    const attributes = ['noise', 'friendliness', 'cleanliness'];
    
    attributes.forEach(attr => {
      const attrRatings = allRatings?.filter(r => r.attribute === attr) || [];
      if (attrRatings.length > 0) {
        const sum = attrRatings.reduce((total, r) => total + r.stars, 0);
        const avg = sum / attrRatings.length;
        overallData.push({
          attribute: attr,
          avg_rating: Math.round(avg * 100) / 100,
          rating_count: attrRatings.length
        });
      }
    });

    // Use raw ratings for activity log
    const ratingLog = allRatings || [];
    
    // For weekly and monthly data, we can still use functions
    const [weeklyResult, monthlyResult] = await Promise.all([
      supabase.rpc('get_weekly_averages', { property_id_param: testProperty.id }),
      supabase.rpc('get_monthly_averages', { property_id_param: testProperty.id })
    ]);

    const weeklyData = weeklyResult.data || [];
    const monthlyData = monthlyResult.data || [];

    console.log(`✅ Found ${overallData.length} overall ratings, ${weeklyData.length} weekly entries, ${ratingLog.length} raw rating entries`);

    // Create PDF
    console.log('🔧 Creating PDF document...');
    const doc = new jsPDF();
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Helper function to check if we need a new page
    const checkPageBreak = (spaceNeeded: number = 20) => {
      if (yPosition + spaceNeeded > 270) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255); // Blue color
    doc.text('Property Rating Report', margin, yPosition);
    yPosition += 15;

    // Generation date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125); // Gray color
    const now = new Date();
    doc.text(`Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, margin, yPosition);
    yPosition += 20;

    // Property Information Section
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Property Information', margin, yPosition);
    yPosition += 10;

    // Property details box
    doc.setDrawColor(0, 122, 255);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'FD');
    
    yPosition += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 37, 41);
    doc.text(`Name: ${testProperty.name}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Address: ${testProperty.address}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Coordinates: ${testProperty.lat.toFixed(6)}, ${testProperty.lng.toFixed(6)}`, margin + 5, yPosition);
    yPosition += 20;

    // Overall Rating Summary
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Overall Rating Summary', margin, yPosition);
    yPosition += 15;

    if (overallData.length > 0) {
      const cardWidth = (contentWidth - 20) / 3;
      let xPos = margin;
      
      overallData.forEach((rating: any, index: number) => {
        // Rating card
        doc.setDrawColor(233, 236, 239);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos, yPosition, cardWidth, 30, 2, 2, 'FD');
        
        // Attribute name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(73, 80, 87);
        const attrText = rating.attribute.charAt(0).toUpperCase() + rating.attribute.slice(1);
        doc.text(attrText, xPos + cardWidth/2, yPosition + 8, { align: 'center' });
        
        // Rating value
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 122, 255);
        doc.text(`${rating.avg_rating} stars`, xPos + cardWidth/2, yPosition + 18, { align: 'center' });
        
        // Rating count
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(108, 117, 125);
        doc.text(`${rating.rating_count} ratings`, xPos + cardWidth/2, yPosition + 25, { align: 'center' });
        
        xPos += cardWidth + 10;
      });
      yPosition += 40;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No ratings available for this property', margin, yPosition);
      yPosition += 20;
    }

    // Weekly Trends Table
    checkPageBreak(80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Weekly Trends (Last 8 Weeks)', margin, yPosition);
    yPosition += 15;

    if (weeklyData.length > 0) {
      // Group weekly data
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

      // Table header
      const colWidth = contentWidth / 4;
      doc.setFillColor(0, 122, 255);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, yPosition, contentWidth, 8, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Week Starting', margin + 2, yPosition + 5);
      doc.text('Noise', margin + colWidth + 2, yPosition + 5);
      doc.text('Friendliness', margin + colWidth * 2 + 2, yPosition + 5);
      doc.text('Cleanliness', margin + colWidth * 3 + 2, yPosition + 5);
      yPosition += 8;

      // Table rows
      weeks.slice(0, 10).forEach((week: any, index: number) => {
        checkPageBreak(8);
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(margin, yPosition, contentWidth, 6, 'F');
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        
        const weekDate = new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        doc.text(weekDate, margin + 2, yPosition + 4);
        doc.text(week.noise ? `${week.noise.avg_rating}` : '-', margin + colWidth + 2, yPosition + 4);
        doc.text(week.friendliness ? `${week.friendliness.avg_rating}` : '-', margin + colWidth * 2 + 2, yPosition + 4);
        doc.text(week.cleanliness ? `${week.cleanliness.avg_rating}` : '-', margin + colWidth * 3 + 2, yPosition + 4);
        
        yPosition += 6;
      });
      yPosition += 10;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No weekly trend data available', margin, yPosition);
      yPosition += 20;
    }

    // Monthly Trends
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Monthly Trends (Last 12 Months)', margin, yPosition);
    yPosition += 15;

    if (monthlyData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 37, 41);
      
      monthlyData.forEach((month: any, index: number) => {
        checkPageBreak(6);
        const monthStr = new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        doc.text(`${monthStr}: ${month.attribute} = ${month.avg_rating} stars (${month.rating_count} ratings)`, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No monthly trend data available', margin, yPosition);
      yPosition += 20;
    }

    // All Rating Activity
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('All Rating Activity', margin, yPosition);
    yPosition += 15;

    if (ratingLog.length > 0) {
      // Log section background - dynamic height based on data
      doc.setFillColor(248, 249, 250);
      const ratingsToShow = Math.min(ratingLog.length, 50);
      const logHeight = Math.min(ratingsToShow * 5 + 10, 200); // Much bigger section
      doc.roundedRect(margin, yPosition, contentWidth, logHeight, 2, 2, 'F');
      yPosition += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 37, 41);
      
      // Show ALL ratings (up to 50 to be safe)
      console.log(`📋 Showing ${ratingsToShow} of ${ratingLog.length} total ratings in PDF`);
      
      ratingLog.slice(0, ratingsToShow).forEach((rating: any) => {
        checkPageBreak(5);
        // Convert timezone properly for user-friendly display
        const date = new Date(rating.created_at);
        const logDate = date.toLocaleDateString();
        const logTime = date.toLocaleTimeString();
        
        // Create user hash for privacy (first 8 chars of user_id)
        const userHash = rating.user_id.toString().substring(0, 8);
        
        doc.text(`${logDate} ${logTime} - ${rating.attribute}: ${rating.stars} stars (User: ${userHash})`, margin + 3, yPosition);
        yPosition += 4;
      });
      yPosition += 15;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No rating history available', margin, yPosition);
      yPosition += 20;
    }

    // Footer
    checkPageBreak(20);
    doc.setDrawColor(233, 236, 239);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('This report was generated automatically by the Property Ratings System.', margin, yPosition);
    yPosition += 4;
    doc.text(`Report ID: ${testProperty.id} | Generated: ${new Date().toISOString()}`, margin, yPosition);

    // Save PDF
    const fileName = `property-report-${testProperty.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), fileName);
    
    console.log('💾 Saving PDF file...');
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
    
    console.log(`\n✅ PDF Report generated successfully!`);
    console.log(`📄 Property: ${testProperty.name}`);
    console.log(`📁 File saved: ${fileName}`);
    console.log(`📍 Full path: ${filePath}`);
    console.log(`📊 File size: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
    
    console.log(`\n🚀 Opening PDF...`);
    
    // Open the PDF file
    const { exec } = require('child_process');
    exec(`start "${fileName}"`, (error: any) => {
      if (error) {
        console.log(`⚠️  Could not auto-open PDF. Please manually open: ${fileName}`);
      } else {
        console.log(`📖 PDF opened successfully!`);
      }
    });

  } catch (error) {
    console.error('❌ PDF generation failed:', error);
  }
}

generateDirectPDF().catch(console.error);
