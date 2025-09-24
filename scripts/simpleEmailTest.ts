#!/usr/bin/env ts-node

// Load environment variables
import { config } from 'dotenv';

// Load .env file
const result = config();
console.log('Dotenv loaded:', result.error ? 'ERROR' : 'SUCCESS');
if (result.error) {
  console.log('Error:', result.error.message);
} else {
  console.log('Parsed keys:', Object.keys(result.parsed || {}));
}

// Simple email test without complex imports
async function testResendDirectly() {
  console.log('📧 Testing Resend Email Service Directly\n');

  // Check environment variables
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  
  console.log('🔧 Configuration:');
  console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   From Email: ${fromEmail}`);
  console.log('');

  if (!apiKey) {
    console.log('❌ RESEND_API_KEY not found in environment variables');
    console.log('💡 Create a .env file with:');
    console.log('   RESEND_API_KEY=re_your_key_here');
    console.log('   FROM_EMAIL=onboarding@resend.dev');
    return;
  }

  try {
    console.log('📤 Sending test email via Resend API...');

    const testEmail = {
      from: `Property Ratings <${fromEmail}>`,
      to: ['test@example.com'], // Replace with your email for real testing
      subject: 'Test Property Report',
      html: `
        <h1>🏠 Test Property Report</h1>
        <p>This is a test email from your Property Ratings system!</p>
        <p><strong>Property:</strong> Test Property</p>
        <p><strong>Address:</strong> 123 Test Street</p>
        <a href="https://example.com/report.pdf" style="background: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          📄 Download Report
        </a>
        <p><small>This is a test email. The download link is not real.</small></p>
      `
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(testEmail)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Email sent successfully!');
    console.log(`📧 Email ID: ${result.id}`);
    console.log('💡 Check the test email inbox (test@example.com)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testResendDirectly().catch(console.error);
