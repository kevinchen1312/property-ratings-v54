#!/usr/bin/env ts-node

/**
 * Example of how to integrate the email service with your PDF report generation
 * This shows the complete flow: Generate PDF → Upload to Storage → Email Link
 */

import { createClient } from '@supabase/supabase-js';
import { sendReportEmail } from '../src/services/email.js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateAndEmailReport() {
  console.log('🔄 Complete Report Generation & Email Flow\n');

  try {
    // Step 1: Get property information
    const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';
    const { data: property, error: propertyError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('❌ Property not found:', propertyError);
      return;
    }

    console.log(`🏠 Property: ${property.name}`);

    // Step 2: Generate PDF using your existing Edge Function
    console.log('📄 Generating PDF report...');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const reportResponse = await fetch(`${supabaseUrl}/functions/v1/generatePropertyReportHTML`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
      },
      body: JSON.stringify({ propertyId })
    });

    if (!reportResponse.ok) {
      console.error('❌ PDF generation failed');
      return;
    }

    // For this example, we'll simulate a successful PDF generation
    // In reality, you'd get the actual signed URL from your Edge Function
    const mockSignedUrl = 'https://oyphcjbickujybvbeame.supabase.co/storage/v1/object/sign/reports/property-report-example.pdf?token=example';

    console.log('✅ PDF generated successfully');
    console.log(`🔗 Signed URL: ${mockSignedUrl}`);

    // Step 3: Email the report to the buyer
    const buyerEmail = 'buyer@example.com'; // This would come from your app's user input

    console.log(`📧 Emailing report to: ${buyerEmail}`);

    const emailSuccess = await sendReportEmail(
      buyerEmail,
      {
        id: property.id,
        name: property.name,
        address: property.address
      },
      mockSignedUrl
    );

    if (emailSuccess) {
      console.log('🎉 Complete flow successful!');
      console.log('✅ PDF generated and emailed to buyer');
    } else {
      console.log('❌ Email delivery failed');
    }

  } catch (error) {
    console.error('❌ Flow failed:', error);
  }
}

// Example usage in your mobile app:
async function mobileAppExample() {
  console.log('\n📱 Mobile App Integration Example:\n');

  console.log(`
// In your React Native component:

import { sendReportEmail } from '../services/email';

const handleSendReport = async () => {
  try {
    setLoading(true);
    
    // 1. Generate PDF (using your existing Edge Function)
    const reportUrl = await generatePDFReport(propertyId);
    
    // 2. Email the report
    const success = await sendReportEmail(
      buyerEmail,
      selectedProperty,
      reportUrl
    );
    
    if (success) {
      Alert.alert('Success', 'Report sent to buyer!');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to send report');
  } finally {
    setLoading(false);
  }
};

// Usage in JSX:
<TouchableOpacity onPress={handleSendReport}>
  <Text>📧 Email Report to Buyer</Text>
</TouchableOpacity>
  `);
}

console.log('🔄 Running complete integration example...');
generateAndEmailReport()
  .then(() => mobileAppExample())
  .catch(console.error);
