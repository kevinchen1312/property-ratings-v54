#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateRawDataPDF() {
  console.log('📄 Generating PDF with EXACT Supabase Raw Data\n');

  try {
    const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';

    // Get property info
    const { data: propertyData, error: propertyError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('id', propertyId)
      .single();

    if (propertyError || !propertyData) {
      console.error('❌ Property not found:', propertyError);
      return;
    }

    console.log(`🎯 Generating PDF for: ${propertyData.name}`);

    // Get ALL ratings directly from the table - NO FUNCTIONS, just raw data
    const { data: allRatings, error: ratingsError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('❌ Failed to get ratings:', ratingsError);
      return;
    }

    console.log(`📊 Retrieved ${allRatings?.length || 0} raw ratings from Supabase table`);

    // Calculate averages manually from raw data
    const overallAverages: any[] = [];
    const attributes = ['noise', 'friendliness', 'cleanliness'];
    
    attributes.forEach(attr => {
      const attrRatings = allRatings?.filter(r => r.attribute === attr) || [];
      if (attrRatings.length > 0) {
        const sum = attrRatings.reduce((total, r) => total + r.stars, 0);
        const avg = sum / attrRatings.length;
        overallAverages.push({
          attribute: attr,
          avg_rating: Math.round(avg * 100) / 100, // Round to 2 decimals
          rating_count: attrRatings.length
        });
      }
    });

    console.log('📊 Manual averages calculated from raw data');

    // Create PDF
    console.log('🔧 Creating PDF with raw Supabase data...');
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
    doc.setTextColor(0, 122, 255);
    doc.text('Property Rating Report (Raw Supabase Data)', margin, yPosition);
    yPosition += 15;

    // Generation date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    const now = new Date();
    doc.text(`Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, margin, yPosition);
    yPosition += 20;

    // Property Information
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Property Information', margin, yPosition);
    yPosition += 10;

    doc.setDrawColor(0, 122, 255);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'FD');
    
    yPosition += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 37, 41);
    doc.text(`Name: ${propertyData.name}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Address: ${propertyData.address}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Coordinates: ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}`, margin + 5, yPosition);
    yPosition += 20;

    // Overall Rating Summary (from raw calculations)
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Overall Rating Summary (Calculated from Raw Data)', margin, yPosition);
    yPosition += 15;

    if (overallAverages.length > 0) {
      const cardWidth = (contentWidth - 20) / 3;
      let xPos = margin;
      
      overallAverages.forEach((rating: any) => {
        doc.setDrawColor(233, 236, 239);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos, yPosition, cardWidth, 30, 2, 2, 'FD');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(73, 80, 87);
        const attrText = rating.attribute.charAt(0).toUpperCase() + rating.attribute.slice(1);
        doc.text(attrText, xPos + cardWidth/2, yPosition + 8, { align: 'center' });
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 122, 255);
        doc.text(`${rating.avg_rating} stars`, xPos + cardWidth/2, yPosition + 18, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(108, 117, 125);
        doc.text(`${rating.rating_count} ratings`, xPos + cardWidth/2, yPosition + 25, { align: 'center' });
        
        xPos += cardWidth + 10;
      });
      yPosition += 40;
    }

    // All Raw Rating Data
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text(`All Raw Rating Data (${allRatings?.length || 0} total entries)`, margin, yPosition);
    yPosition += 15;

    if (allRatings && allRatings.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 37, 41);
      
      console.log(`📋 Adding all ${allRatings.length} ratings to PDF with raw timestamps`);
      
      allRatings.forEach((rating: any, index: number) => {
        checkPageBreak(5);
        
        // Use the EXACT timestamp from Supabase - no conversion
        const rawTimestamp = rating.created_at;
        
        // Create a hash of the user_id for privacy (first 8 chars)
        const userHash = rating.user_id.toString().substring(0, 8);
        
        doc.text(`${index + 1}. ${rawTimestamp} - ${rating.attribute}: ${rating.stars} stars (User: ${userHash})`, margin + 3, yPosition);
        yPosition += 4;
      });
    }

    // Footer
    checkPageBreak(20);
    doc.setDrawColor(233, 236, 239);
    doc.line(margin, yPosition + 10, pageWidth - margin, yPosition + 10);
    yPosition += 20;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('This report contains raw data directly from Supabase with no modifications.', margin, yPosition);
    yPosition += 4;
    doc.text(`Property ID: ${propertyData.id} | Generated: ${new Date().toISOString()}`, margin, yPosition);

    // Save PDF
    const fileName = `raw-property-report-${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), fileName);
    
    console.log('💾 Saving PDF with raw Supabase data...');
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
    
    console.log(`\n✅ Raw Data PDF generated successfully!`);
    console.log(`📄 Property: ${propertyData.name}`);
    console.log(`📁 File saved: ${fileName}`);
    console.log(`📊 Contains: ${allRatings?.length || 0} raw rating entries`);
    console.log(`📍 Timestamps: Exactly as stored in Supabase (no timezone conversion)`);
    
    console.log(`\n🚀 Opening PDF...`);
    
    // Open the PDF file
    const { exec } = require('child_process');
    exec(`start "${fileName}"`, (error: any) => {
      if (error) {
        console.log(`⚠️  Could not auto-open PDF. Please manually open: ${fileName}`);
      } else {
        console.log(`📖 Raw data PDF opened successfully!`);
      }
    });

  } catch (error) {
    console.error('❌ Raw PDF generation failed:', error);
  }
}

generateRawDataPDF().catch(console.error);

