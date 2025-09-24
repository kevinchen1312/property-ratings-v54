// Complete PDF Generation + Email Flow
import { jsPDF } from 'jspdf';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';
const RESEND_API_KEY = 're_ZMwb2HWx_F9sThWh2ZtBEP9mRLGo6K2no';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

interface Rating {
  id: string;
  created_at: string;
  attribute: string;
  stars: number;
  property_id: string;
  user_id: string;
}

async function generatePDFReport(propertyId: string): Promise<string> {
  console.log('📊 Generating PDF report for property:', propertyId);
  
  // Fetch property data
  const { data: property, error: propError } = await supabase
    .from('property')
    .select('*')
    .eq('id', propertyId)
    .single();
    
  if (propError) throw new Error(`Property not found: ${propError.message}`);
  
  // Fetch all ratings
  const { data: ratings, error: ratingsError } = await supabase
    .from('rating')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
    
  if (ratingsError) throw new Error(`Ratings fetch failed: ${ratingsError.message}`);
  
  // Generate PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(20);
  doc.text('Property Rating Report', pageWidth / 2, 20, { align: 'center' });
  
  // Property info
  doc.setFontSize(12);
  doc.text(`Property: ${property.name}`, 20, 40);
  doc.text(`Address: ${property.address}`, 20, 50);
  doc.text(`Total Ratings: ${ratings.length}`, 20, 60);
  
  // Calculate averages
  const noiseRatings = ratings.filter(r => r.attribute === 'noise').map(r => r.stars);
  const friendlinessRatings = ratings.filter(r => r.attribute === 'friendliness').map(r => r.stars);
  const cleanlinessRatings = ratings.filter(r => r.attribute === 'cleanliness').map(r => r.stars);
  
  const avgNoise = noiseRatings.length > 0 ? (noiseRatings.reduce((a, b) => a + b, 0) / noiseRatings.length).toFixed(1) : 'N/A';
  const avgFriendliness = friendlinessRatings.length > 0 ? (friendlinessRatings.reduce((a, b) => a + b, 0) / friendlinessRatings.length).toFixed(1) : 'N/A';
  const avgCleanliness = cleanlinessRatings.length > 0 ? (cleanlinessRatings.reduce((a, b) => a + b, 0) / cleanlinessRatings.length).toFixed(1) : 'N/A';
  
  // Averages section
  doc.setFontSize(14);
  doc.text('Overall Averages', 20, 80);
  doc.setFontSize(12);
  doc.text(`Noise: ${avgNoise}/5 stars (${noiseRatings.length} ratings)`, 20, 95);
  doc.text(`Friendliness: ${avgFriendliness}/5 stars (${friendlinessRatings.length} ratings)`, 20, 105);
  doc.text(`Cleanliness: ${avgCleanliness}/5 stars (${cleanlinessRatings.length} ratings)`, 20, 115);
  
  // All rating activity
  doc.setFontSize(14);
  doc.text('All Rating Activity', 20, 135);
  doc.setFontSize(10);
  
  let yPos = 150;
  const maxRatingsPerPage = 15; // Fit more per page
  let currentPage = 1;
  
  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i];
    
    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      currentPage++;
      yPos = 20;
      doc.setFontSize(14);
      doc.text(`All Rating Activity (Page ${currentPage})`, 20, yPos);
      yPos += 20;
      doc.setFontSize(10);
    }
    
    const date = new Date(rating.created_at).toLocaleDateString();
    const time = new Date(rating.created_at).toLocaleTimeString();
    doc.text(`${i + 1}. ${date} ${time} - ${rating.attribute}: ${rating.stars} stars`, 20, yPos);
    yPos += 10;
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `property-report-${propertyId.slice(0, 8)}-${timestamp}.pdf`;
  const filepath = path.join(process.cwd(), filename);
  
  // Save PDF
  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(filepath, Buffer.from(pdfOutput));
  console.log(`✅ PDF generated: ${filename}`);
  
  return filepath;
}

async function emailReport(recipientEmail: string, propertyName: string, pdfPath: string): Promise<void> {
  console.log('📧 Sending email to:', recipientEmail);
  
  // Read PDF file
  const pdfBuffer = fs.readFileSync(pdfPath);
  const filename = path.basename(pdfPath);
  
  const result = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: recipientEmail,
    subject: `Property Report: ${propertyName}`,
    html: `
      <h2>Property Rating Report</h2>
      <p>Please find attached the property rating report for <strong>${propertyName}</strong>.</p>
      <p>This report includes:</p>
      <ul>
        <li>Overall rating averages</li>
        <li>Recent rating activity</li>
        <li>Property details</li>
      </ul>
      <p>Thank you for your interest!</p>
    `,
    attachments: [
      {
        filename: filename,
        content: pdfBuffer,
      },
    ],
  });
  
  if (result.error) {
    throw new Error(`Email failed: ${result.error.message}`);
  }
  
  console.log(`✅ Email sent successfully! ID: ${result.data?.id}`);
}

async function main() {
  try {
    console.log('🚀 Starting PDF Report + Email Flow\n');
    
    // Test property ID (from our sample data)
    const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';
    const recipientEmail = 'kevinchen1312@gmail.com'; // Your email
    
    // Step 1: Generate PDF
    const pdfPath = await generatePDFReport(propertyId);
    
    // Step 2: Email PDF
    await emailReport(recipientEmail, 'Test Property', pdfPath);
    
    // Step 3: Cleanup
    fs.unlinkSync(pdfPath);
    console.log('🧹 Temporary PDF file cleaned up');
    
    console.log('\n🎉 Complete! Check your email for the report.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
