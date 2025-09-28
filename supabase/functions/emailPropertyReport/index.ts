import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId, userEmail } = await req.json()

    if (!propertyId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'propertyId and userEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating PDF report for property: ${propertyId}, email: ${userEmail}`)

    // Nuclear option: replace ALL emojis and special characters that could cause encoding issues
    const cleanText = (text) => {
      if (!text) return text;
      return String(text)
        // Replace star emojis specifically
        .replace(/⭐/g, 'star')
        .replace(/★/g, 'star') 
        .replace(/☆/g, 'star')
        .replace(/✨/g, 'sparkle')
        // Remove ALL other emojis and special Unicode characters
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Regional indicators
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation selectors
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Extended symbols
        // Remove any remaining high Unicode characters that might cause issues
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
        // Keep only basic ASCII and common extended characters
        .replace(/[^\x00-\x7F\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '')
        .trim();
    };

    // Get property information
    const { data: propertyData, error: propertyError } = await supabaseClient
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('id', propertyId)
      .single()

    if (propertyError || !propertyData) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get report data
    const { data: overallData } = await supabaseClient.rpc('get_overall_averages', {
      property_id_param: propertyId
    })
    
    console.log('Raw overall data:', JSON.stringify(overallData))

    const { data: weeklyData } = await supabaseClient.rpc('get_weekly_averages', {
      property_id_param: propertyId
    })

    const { data: monthlyData } = await supabaseClient.rpc('get_monthly_averages', {
      property_id_param: propertyId
    })

    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    console.log('Raw rating log data:', JSON.stringify(ratingLog, null, 2));
    
    // Log each rating entry to see what fields are available
    if (ratingLog && ratingLog.length > 0) {
      console.log('First rating entry keys:', Object.keys(ratingLog[0]));
      console.log('First rating entry:', JSON.stringify(ratingLog[0], null, 2));
    }

    // Clean ALL data aggressively to prevent any emojis from reaching jsPDF
    if (propertyData) {
      propertyData.name = cleanText(propertyData.name);
      propertyData.address = cleanText(propertyData.address);
    }
    
    if (overallData) {
      overallData.forEach(item => {
        if (item.attribute) item.attribute = cleanText(item.attribute);
      });
    }
    
    if (weeklyData) {
      weeklyData.forEach(item => {
        if (item.attribute) item.attribute = cleanText(item.attribute);
      });
    }
    
    if (ratingLog) {
      ratingLog.forEach(item => {
        if (item.attribute) item.attribute = cleanText(item.attribute);
      });
    }

    // Helper function to remove emojis from text for PDF compatibility
    const removeEmojis = (text: string): string => {
      if (!text) return '';
      return text
        // Remove all emoji ranges
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicators
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (includes 🏠)
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
        .replace(/[\u{E000}-\u{F8FF}]/gu, '')   // Private use area
        .replace(/⭐/gu, '')                     // Star emoji specifically
        .replace(/★/gu, '')                     // Black star
        .replace(/☆/gu, '')                     // White star
        .replace(/✨/gu, '')                     // Sparkles
        .trim();
    };

    // Calculate averages manually from raw data (like your existing script)
    const allRatings = ratingLog || [];
    const overallDataCalculated: any[] = [];
    const attributes = ['noise', 'safety', 'cleanliness'];
    
    attributes.forEach(attr => {
      const attrRatings = allRatings.filter((r: any) => r.attribute === attr);
      if (attrRatings.length > 0) {
        const sum = attrRatings.reduce((total: number, r: any) => total + r.stars, 0);
        const avg = sum / attrRatings.length;
        overallDataCalculated.push({
          attribute: cleanText(attr),
          avg_rating: Math.round(avg * 100) / 100,
          rating_count: attrRatings.length
        });
      }
    });

    // Generate PDF using jsPDF (your existing implementation)
    console.log('Creating PDF document using jsPDF...');
    console.log('Property name (raw):', propertyData.name);
    console.log('Property name (cleaned):', removeEmojis(propertyData.name));
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
    doc.text('Property Rating Report', margin, yPosition);
    yPosition += 15;

    // Generation date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
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
    doc.text(`Name: ${cleanText(propertyData.name)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Address: ${cleanText(propertyData.address)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Coordinates: ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}`, margin + 5, yPosition);
    yPosition += 20;

    // Overall Rating Summary
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Overall Rating Summary', margin, yPosition);
    yPosition += 15;

    if (overallDataCalculated.length > 0) {
      const cardWidth = (contentWidth - 20) / 3;
      let xPos = margin;
      
      overallDataCalculated.forEach((rating: any, index: number) => {
        // Rating card
        doc.setDrawColor(233, 236, 239);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos, yPosition, cardWidth, 30, 2, 2, 'FD');
        
        // Attribute name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(73, 80, 87);
        const attrText = cleanText(rating.attribute.charAt(0).toUpperCase() + rating.attribute.slice(1));
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

    if (weeklyData && weeklyData.length > 0) {
      // Group weekly data
            const weeklyGrouped = weeklyData.reduce((acc: any, item: any) => {
                const weekKey = item.week_start;
                if (!acc[weekKey]) {
                    acc[weekKey] = { week_start: weekKey, noise: null, safety: null, cleanliness: null };
                }
        const cleanAttribute = cleanText(item.attribute);
        acc[weekKey][cleanAttribute] = { avg_rating: item.avg_rating, rating_count: item.rating_count };
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
      doc.text('Safety', margin + colWidth * 2 + 2, yPosition + 5);
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
        doc.text(week.safety ? `${week.safety.avg_rating}` : '-', margin + colWidth * 2 + 2, yPosition + 4);
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

    // Rating Activity Log
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Recent Rating Activity', margin, yPosition);
    yPosition += 15;

    if (ratingLog && ratingLog.length > 0) {
      const recentRatings = (ratingLog as any[]).slice(0, 20); // Show last 20 ratings
      for (const rating of recentRatings) {
        if (yPosition < 50) break; // Stop if we run out of space
        
        checkPageBreak(5);
        const date = new Date(rating.created_at);
        const logDate = date.toLocaleDateString();
        // Handle both user_id and user_hash fields depending on which function is deployed
        const userHash = rating.user_hash || (rating.user_id ? rating.user_id.toString().substring(0, 8) : 'unknown');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        doc.text(`${logDate} - ${cleanText(rating.attribute)}: ${rating.stars} stars (User: ${userHash})`, margin, yPosition);
        yPosition += 4;
      }
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
    doc.text(`Report ID: ${removeEmojis(propertyId)} | Generated: ${new Date().toISOString()}`, margin, yPosition);

    // Generate PDF buffer
    console.log('Generating PDF buffer...');
    const pdfBuffer = doc.output('arraybuffer')

    // Upload PDF to Supabase Storage
    const pdfFileName = `property-report-${cleanText(propertyData.name).replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`
    
    console.log('Uploading PDF to Supabase Storage...');
    const { error: pdfUploadError } = await supabaseClient.storage
      .from('reports')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to store PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get signed URL for PDF
    const { data: pdfSignedUrlData } = await supabaseClient.storage
      .from('reports')
      .createSignedUrl(pdfFileName, 7 * 24 * 60 * 60) // 7 days

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'PDF generated but email not sent (Resend API key not configured)',
          property: propertyData.name,
          userEmail: userEmail,
          pdfUrl: pdfSignedUrlData?.signedUrl,
          note: 'Configure RESEND_API_KEY to enable email delivery'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fromEmail = Deno.env.get('REPORTS_FROM_EMAIL') || 'onboarding@resend.dev';
    console.log('Sending email with PDF attachment...');
    console.log('From email:', fromEmail);
    console.log('To email:', userEmail);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `Property Ratings <${fromEmail}>`,
        to: [userEmail],
        subject: `Property Rating Report - ${propertyData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007AFF;">Your Property Rating Report is Ready!</h1>
            
            <p>Hello!</p>
            
            <p>Your requested property rating report for <strong>${propertyData.name}</strong> has been generated and is attached to this email as a PDF.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #007AFF;">Property Details</h3>
              <p><strong>Name:</strong> ${propertyData.name}</p>
              <p><strong>Address:</strong> ${propertyData.address}</p>
              <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>The attached PDF report includes:</p>
            <ul>
              <li>Overall rating averages</li>
              <li>Weekly trends (last 8 weeks)</li>
              <li>Recent rating activity</li>
              <li>Detailed property information</li>
            </ul>
            
            <p>If you have any questions about this report, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            The Property Ratings Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #6c757d;">
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${cleanText(propertyData.name).replace(/[^a-zA-Z0-9]/g, '-')}-report.pdf`,
            content: Array.from(new Uint8Array(pdfBuffer)),
            type: 'application/pdf'
          }
        ]
      })
    })

    console.log('Email response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error('Email sending error:', emailError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'PDF generated but email failed to send',
          property: propertyData.name,
          userEmail: userEmail,
          pdfUrl: pdfSignedUrlData?.signedUrl,
          error: 'Email delivery failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResult = await emailResponse.json()
    console.log('PDF email sent successfully! ID:', emailResult.id)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF report generated and emailed successfully!',
        property: propertyData.name,
        userEmail: userEmail,
        emailId: emailResult.id,
        pdfUrl: pdfSignedUrlData?.signedUrl,
        format: 'PDF'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})