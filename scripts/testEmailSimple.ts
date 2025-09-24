// Simple email test - fresh start
import { Resend } from 'resend';

async function testEmail() {
  console.log('🚀 Testing Email Service - Fresh Start\n');
  
  // Direct API key (we'll move to .env later)
  const apiKey = 're_ZMwb2HWx_F9sThWh2ZtBEP9mRLGo6K2no';
  
  if (!apiKey || apiKey.includes('your_key_here')) {
    console.log('❌ API key not set properly');
    return;
  }
  
  console.log('✅ API key found');
  console.log('📧 Attempting to send test email...\n');
  
  try {
    const resend = new Resend(apiKey);
    
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'kevinchen1312@gmail.com', // Your verified email
      subject: 'Property Report Test',
      text: 'This is a test email from the Property Ratings app!'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Result:', result);
    
  } catch (error) {
    console.log('❌ Email failed:');
    console.log(error);
  }
}

testEmail().catch(console.error);
