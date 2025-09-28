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
      Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId, userEmail } = await req.json()

    if (!propertyId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'propertyId and userEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating PDF report for property: ${propertyId}, email: ${userEmail}`)

    // Helper function to replace star emojis with text
    const cleanText = (text) => {
      if (!text) return text;
      return String(text)
        .replace(/⭐/g, 'star')
        .replace(/★/g, 'star') 
        .replace(/☆/g, 'star')
        .replace(/✨/g, 'sparkle')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
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

    // Get rating data
    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    // Clean all data
    if (propertyData) {
      propertyData.name = cleanText(propertyData.name);
      propertyData.address = cleanText(propertyData.address);
    }
    
    if (ratingLog) {
      ratingLog.forEach(item => {
        if (item.attribute) item.attribute = cleanText(item.attribute);
      });
    }

    // Calculate averages manually from raw data
    const allRatings = ratingLog || [];
    const overallDataCalculated = [];
    const attributes = ['noise', 'friendliness', 'cleanliness'];
    
    attributes.forEach(attr => {
      const attrRatings = allRatings.filter((r) => r.attribute === attr);
      if (attrRatings.length > 0) {
        const sum = attrRatings.reduce((total, r) => total + r.stars, 0);
        const avg = sum / attrRatings.length;
        overallDataCalculated.push({
          attribute: cleanText(attr),
          avg_rating: Math.round(avg * 100) / 100,
          rating_count: attrRatings.length
        });
      }
    });

    // Generate PDF using jsPDF
    console.log('Creating PDF document using jsPDF...');
    const doc = new jsPDF();
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

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

    // Property Information
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

    // Overall Rating Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Overall Rating Summary', margin, yPosition);
    yPosition += 15;

    if (overallDataCalculated.length > 0) {
      overallDataCalculated.forEach((rating) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        doc.text(`${rating.attribute}: ${rating.avg_rating} stars (${rating.rating_count} ratings)`, margin, yPosition);
        yPosition += 10;
      });
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No ratings available for this property', margin, yPosition);
    }
    yPosition += 20;

    // Recent Rating Activity
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text('Recent Rating Activity', margin, yPosition);
    yPosition += 15;

    if (ratingLog && ratingLog.length > 0) {
      const recentRatings = ratingLog.slice(0, 10);
      for (const rating of recentRatings) {
        if (yPosition > 250) break;
        
        const date = new Date(rating.created_at);
        const logDate = date.toLocaleDateString();
        const userHash = rating.user_hash || (rating.user_id ? rating.user_id.toString().substring(0, 8) : 'unknown');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        doc.text(`${logDate} - ${rating.attribute}: ${rating.stars} stars (User: ${userHash})`, margin, yPosition);
        yPosition += 8;
      }
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(108, 117, 125);
      doc.text('No rating history available', margin, yPosition);
    }

    // Generate PDF buffer
    console.log('Generating PDF buffer...');
    const pdfBuffer = doc.output('arraybuffer')

    // Upload PDF to Supabase Storage
    const pdfFileName = `property-report-${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`
    
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
      .createSignedUrl(pdfFileName, 7 * 24 * 60 * 60)

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.log('No Resend API key configured')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'PDF generated but email not sent (Resend API key not configured)',
          property: propertyData.name,
          userEmail: userEmail,
          pdfUrl: pdfSignedUrlData?.signedUrl
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
              <li>Recent rating activity</li>
              <li>Detailed property information</li>
            </ul>
            <p>If you have any questions about this report, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The Property Ratings Team</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
            <p style="font-size: 12px; color: #6c757d;">This email was sent automatically. Please do not reply to this email.</p>
          </div>
        `,
        attachments: [
          {
            filename: `${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-report.pdf`,
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
