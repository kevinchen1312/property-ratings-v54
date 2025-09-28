import { Alert } from 'react-native';

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
}

/**
 * Send a property report email to a buyer using Resend
 */
export const sendReportEmail = async (
  to: string,
  property: Property,
  reportUrl: string,
  config?: EmailConfig
): Promise<boolean> => {
  try {
    // Use config or fall back to environment variables
    const apiKey = config?.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = config?.fromEmail || process.env.FROM_EMAIL || 'reports@yourdomain.com';
    const fromName = config?.fromName || process.env.FROM_NAME || 'Property Ratings';

    if (!apiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      Alert.alert('Configuration Error', 'Email service not configured. Please contact support.');
      return false;
    }

    if (!to || !reportUrl) {
      console.error('❌ Missing required email parameters');
      Alert.alert('Error', 'Invalid email parameters');
      return false;
    }


    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Property Rating Report - ${property.name}`,
      html: generateEmailTemplate(property, reportUrl)
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Resend API error:', errorData);
      Alert.alert('Email Error', 'Failed to send email. Please try again.');
      return false;
    }

    const result = await response.json();

    return true;

  } catch (error) {
    Alert.alert('Error', 'Failed to send email. Please check your connection and try again.');
    return false;
  }
};

/**
 * Generate HTML email template for property report
 */
const generateEmailTemplate = (property: Property, reportUrl: string): string => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Rating Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #007AFF, #5856D6);
            color: white;
            padding: 30px 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .property-card {
            background: #f8f9fa;
            border-left: 4px solid #007AFF;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .property-card h2 {
            margin-top: 0;
            color: #007AFF;
            font-size: 20px;
        }
        .download-button {
            display: inline-block;
            background: #007AFF;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .download-button:hover {
            background: #0056CC;
        }
        .features {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .features ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .features li {
            margin: 8px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        .contact-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Property Rating Report</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your comprehensive property analysis is ready</p>
    </div>

    <p>Hello!</p>
    
    <p>Your requested property rating report has been generated and is ready for download.</p>

    <div class="property-card">
        <h2>📍 Property Details</h2>
        <p><strong>Name:</strong> ${property.name}</p>
        <p><strong>Address:</strong> ${property.address}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" class="download-button">
            📄 Download Your Report
        </a>
    </div>

    <div class="features">
        <h3 style="margin-top: 0; color: #007AFF;">📊 Your Report Includes:</h3>
        <ul>
            <li><strong>Overall Rating Summary</strong> - Average ratings across all categories</li>
            <li><strong>Weekly Trends Analysis</strong> - Rating patterns over the last 8 weeks</li>
            <li><strong>Monthly Historical Data</strong> - Long-term trends over 12 months</li>
            <li><strong>Complete Rating Activity</strong> - Detailed log of all ratings</li>
            <li><strong>Professional Formatting</strong> - Clean, print-ready PDF format</li>
        </ul>
    </div>

    <div class="warning">
        <strong>⏰ Important:</strong> This download link will expire on ${expirationDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} for security purposes. Please download your report soon.
    </div>

    <div class="contact-info">
        <strong>Need Help?</strong><br>
        If you have any questions about your report or need assistance, please don't hesitate to contact our support team.
    </div>

    <div class="footer">
        <p>This email was sent automatically by the Property Ratings System.</p>
        <p>Report ID: ${property.id}</p>
        <p style="margin-top: 15px;">
            <small>Please do not reply to this email. This mailbox is not monitored.</small>
        </p>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Alternative implementation using SendGrid
 * Uncomment this section if you prefer SendGrid over Resend
 */
/*
export const sendReportEmailWithSendGrid = async (
  to: string,
  property: Property,
  reportUrl: string
): Promise<boolean> => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'reports@yourdomain.com';

    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY not configured');
      Alert.alert('Configuration Error', 'Email service not configured.');
      return false;
    }

    const emailData = {
      personalizations: [{
        to: [{ email: to }],
        subject: `Property Rating Report - ${property.name}`
      }],
      from: { email: fromEmail, name: 'Property Ratings' },
      content: [{
        type: 'text/html',
        value: generateEmailTemplate(property, reportUrl)
      }]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ SendGrid API error:', errorData);
      Alert.alert('Email Error', 'Failed to send email. Please try again.');
      return false;
    }

    console.log('✅ Email sent successfully via SendGrid');
    Alert.alert('Email Sent!', `Property report has been sent to ${to}`);
    return true;

  } catch (error) {
    console.error('❌ SendGrid email failed:', error);
    Alert.alert('Error', 'Failed to send email. Please try again.');
    return false;
  }
};
*/

