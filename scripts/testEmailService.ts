#!/usr/bin/env ts-node

import { sendReportEmail } from '../src/services/email.js';

async function testEmailService() {
  console.log('📧 Testing Email Service\n');

  // Mock property data
  const testProperty = {
    id: '364607cd-69fb-4e8a-9b20-4ff4ce6758e7',
    name: '10634 Merriman Road',
    address: '10634 Merriman Road, Cupertino, CA 95014'
  };

  // Mock signed URL (this would come from your PDF generation)
  const mockReportUrl = 'https://oyphcjbickujybvbeame.supabase.co/storage/v1/object/sign/reports/property-report-example.pdf?token=example';

  // Test email address
  const testEmail = 'buyer@example.com';

  // Test email configuration (you can also use environment variables)
  const emailConfig = {
    apiKey: process.env.RESEND_API_KEY || 'your-resend-key-here',
    fromEmail: 'reports@yourdomain.com',
    fromName: 'Property Ratings Team'
  };

  console.log('🎯 Test Parameters:');
  console.log(`   To: ${testEmail}`);
  console.log(`   Property: ${testProperty.name}`);
  console.log(`   Report URL: ${mockReportUrl}`);
  console.log(`   API Key: ${emailConfig.apiKey ? '✅ Configured' : '❌ Missing'}\n`);

  try {
    console.log('📤 Sending test email...');
    
    const success = await sendReportEmail(
      testEmail,
      testProperty,
      mockReportUrl,
      emailConfig
    );

    if (success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Check the recipient\'s inbox for the property report email.');
    } else {
      console.log('❌ Email failed to send.');
      console.log('💡 Check your Resend API key and configuration.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n📋 Setup Instructions:');
  console.log('1. Sign up for Resend at https://resend.com');
  console.log('2. Get your API key from the Resend dashboard');
  console.log('3. Set environment variable: RESEND_API_KEY=re_ZMwb2HWx_F9sThWh2ZtBEP9mRLGo6K2no');
  console.log('4. Update FROM_EMAIL to your verified domain');
  console.log('5. Test with a real email address');
}

testEmailService().catch(console.error);
