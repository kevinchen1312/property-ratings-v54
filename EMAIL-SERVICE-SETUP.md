# 📧 Email Service Setup Guide

## 🎯 **Overview**

The email service allows you to send property report links directly to buyers via email. It supports both **Resend** (recommended) and **SendGrid** with professional HTML email templates.

## 🚀 **Quick Setup**

### **Step 1: Choose Your Email Provider**

#### **Option A: Resend (Recommended)**
- ✅ Simple setup
- ✅ Great developer experience  
- ✅ Competitive pricing
- ✅ Excellent deliverability

1. **Sign up**: Visit [resend.com](https://resend.com)
2. **Get API Key**: Copy from dashboard 
3. **Add Domain**: Verify your sending domain (optional for testing)

#### **Option B: SendGrid (Alternative)**
- ✅ Enterprise-grade
- ✅ Advanced analytics
- ✅ Established provider

1. **Sign up**: Visit [sendgrid.com](https://sendgrid.com)
2. **Get API Key**: Create in Settings → API Keys
3. **Verify Domain**: Required for production use

### **Step 2: Configure Environment Variables**

Create or update your `.env` file:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=reports@yourdomain.com
FROM_NAME=Property Ratings Team

# Alternative (SendGrid)
# SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
```

### **Step 3: Test the Service**

```bash
npm run test:email
```

---

## 📝 **Usage Examples**

### **Basic Usage**

```typescript
import { sendReportEmail } from '../services/email';

const success = await sendReportEmail(
  'buyer@example.com',
  {
    id: 'property-uuid',
    name: 'Beautiful House',
    address: '123 Main St, City, State'
  },
  'https://your-signed-url.com/report.pdf'
);
```

### **With Custom Configuration**

```typescript
const emailConfig = {
  apiKey: 'your-custom-key',
  fromEmail: 'custom@yourdomain.com',
  fromName: 'Custom Sender Name'
};

await sendReportEmail(to, property, url, emailConfig);
```

### **Mobile App Integration**

```typescript
// In your React Native component
const handleEmailReport = async () => {
  try {
    setLoading(true);
    
    // 1. Generate report URL (using your existing system)
    const reportUrl = await generatePropertyReport(propertyId);
    
    // 2. Send email
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
```

---

## 🎨 **Email Template Features**

The email includes:

- ✅ **Professional Design**: Modern, responsive HTML template
- ✅ **Property Details**: Name, address, generation date
- ✅ **Clear Call-to-Action**: Prominent download button
- ✅ **Report Overview**: What's included in the PDF
- ✅ **Expiration Warning**: 7-day link expiration notice
- ✅ **Contact Information**: Support details
- ✅ **Mobile Responsive**: Looks great on all devices

### **Email Preview:**

```
🏠 Property Rating Report
Your comprehensive property analysis is ready

Hello!

Your requested property rating report has been generated...

📍 Property Details
Name: Beautiful House
Address: 123 Main St, City, State  
Report Generated: Monday, January 15, 2024

[📄 Download Your Report]

📊 Your Report Includes:
• Overall Rating Summary
• Weekly Trends Analysis  
• Monthly Historical Data
• Complete Rating Activity
• Professional Formatting

⏰ Important: This link expires in 7 days for security.
```

---

## ⚙️ **Configuration Options**

### **Environment Variables**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | Yes | Resend API key | `re_123...` |
| `FROM_EMAIL` | Optional | Sender email | `reports@yourdomain.com` |
| `FROM_NAME` | Optional | Sender name | `Property Ratings` |
| `SENDGRID_API_KEY` | Alternative | SendGrid key | `SG.123...` |

### **Function Parameters**

```typescript
sendReportEmail(
  to: string,           // Recipient email
  property: Property,   // Property object {id, name, address}  
  reportUrl: string,    // Signed URL to PDF report
  config?: EmailConfig  // Optional custom config
): Promise<boolean>
```

---

## 🔧 **Advanced Setup**

### **Custom Domain Setup (Production)**

For production use, you should:

1. **Verify Your Domain**: Add DNS records in your email provider
2. **Update FROM_EMAIL**: Use your verified domain
3. **Set Up DKIM/SPF**: For better deliverability
4. **Monitor Delivery**: Track opens, clicks, bounces

### **Error Handling**

The service includes comprehensive error handling:

- ✅ **API Key Validation**: Checks for missing configuration
- ✅ **Parameter Validation**: Validates required inputs
- ✅ **Network Error Handling**: Graceful failure with user feedback
- ✅ **User Alerts**: Shows success/error messages in the app

### **Rate Limiting**

Be aware of provider limits:
- **Resend**: 3,000 emails/month free, then $20/month
- **SendGrid**: 100 emails/day free, then paid plans

---

## 🧪 **Testing**

### **Test Commands**

```bash
# Test email service
npm run test:email

# View integration example
npx ts-node scripts/exampleEmailIntegration.ts
```

### **Manual Testing**

1. **Set up API key** in environment variables
2. **Run test script** with a real email address
3. **Check inbox** for the test email
4. **Verify download link** works correctly

---

## 🚀 **Production Checklist**

- [ ] Email provider API key configured
- [ ] Custom domain verified (recommended)
- [ ] FROM_EMAIL set to your domain
- [ ] Test emails working correctly
- [ ] Error handling tested
- [ ] Rate limits understood
- [ ] Monitoring set up (optional)

---

## 💡 **Integration Tips**

1. **Generate PDF First**: Always create the PDF and get the signed URL before sending email
2. **Validate Email**: Check email format before calling the service
3. **Handle Failures**: Show appropriate error messages to users
4. **Track Usage**: Monitor email sending for debugging
5. **Security**: Never expose API keys in client code

Your email service is now ready to send professional property reports to buyers! 📧🎉

