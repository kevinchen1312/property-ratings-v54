# Property Reports Stripe Checkout System

A complete checkout system for purchasing property reports with automated PDF generation and email delivery.

## 🏗️ System Architecture

### Database Schema
- **`purchase`** table: Stores purchase records with Stripe session data
- **`purchase_item`** table: Individual property reports per purchase
- Pricing: $10.00, $9.60, $9.20... (decreasing by $0.40 per item, min $1.00)

### Integration Options
1. **Supabase Edge Functions** (Recommended)
2. **Express.js Server** (Alternative)

---

## 🚀 Quick Setup (Supabase Edge Functions)

### 1. Database Setup

Run the migration:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/purchase_system.sql
```

### 2. Configure Stripe

1. Get your **test keys** from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Set up webhook endpoint in Stripe:
   - URL: `https://your-project.supabase.co/functions/v1/stripeWebhook`
   - Events: `checkout.session.completed`
   - Copy the webhook secret

### 3. Set Supabase Secrets

In Supabase Dashboard → Edge Functions → Secrets:
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
RESEND_API_KEY=re_your_resend_key
WEBHOOK_URL=https://your-project.supabase.co/functions/v1/stripeWebhook
```

### 4. Deploy Functions

```bash
# Deploy checkout function
npx supabase functions deploy createCheckout --project-ref your-project-ref

# Deploy webhook handler
npx supabase functions deploy stripeWebhook --project-ref your-project-ref
```

### 5. Test the System

```javascript
// Test checkout creation
const response = await fetch('https://your-project.supabase.co/functions/v1/createCheckout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyIds: ['364607cd-69fb-4e8a-9b20-4ff4ce6758e7'],
    email: 'customer@example.com',
    customerName: 'John Doe'
  })
});

const { checkout_url } = await response.json();
// Redirect user to checkout_url
```

---

## 🖥️ Alternative: Express.js Server

### 1. Server Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your keys
```

### 2. Environment Variables

Create `server/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_your_resend_key
PORT=3001
```

### 3. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

### 4. Test Server

```bash
npm test
```

---

## 📊 Pricing Structure

| Quantity | Unit Prices | Total |
|----------|-------------|-------|
| 1 report | $10.00 | $10.00 |
| 2 reports | $10.00, $9.60 | $19.60 |
| 3 reports | $10.00, $9.60, $9.20 | $28.80 |
| 4 reports | $10.00, $9.60, $9.20, $8.80 | $37.60 |
| ... | ... | ... |
| 10 reports | $10.00 down to $6.40 | $82.00 |

---

## 🔄 Purchase Flow

1. **Create Checkout**: POST to `/createCheckout` with propertyIds and email
2. **Redirect to Stripe**: User completes payment on Stripe Checkout
3. **Webhook Processing**: 
   - Payment confirmation received
   - Purchase status updated to 'completed'
   - PDF reports generated for each property
   - Email sent with download links
4. **Customer Receives**: Email with 7-day download links

---

## 🧪 Testing

### Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

### Test Webhook Locally
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/webhook

# Test webhook
stripe trigger checkout.session.completed
```

### Sample Test Requests

**Single Property:**
```json
{
  "propertyIds": ["364607cd-69fb-4e8a-9b20-4ff4ce6758e7"],
  "email": "customer@example.com",
  "customerName": "John Doe"
}
```

**Multiple Properties:**
```json
{
  "propertyIds": [
    "364607cd-69fb-4e8a-9b20-4ff4ce6758e7",
    "another-property-id",
    "third-property-id"
  ],
  "email": "bulk@example.com",
  "customerName": "Jane Smith"
}
```

---

## 🔧 API Endpoints

### Supabase Edge Functions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/v1/createCheckout` | POST | Create Stripe checkout session |
| `/functions/v1/stripeWebhook` | POST | Handle Stripe webhooks |

### Express Server

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/create-checkout` | POST | Create checkout session |
| `/webhook` | POST | Handle Stripe webhooks |
| `/health` | GET | Health check |

---

## 📧 Email Template

Customers receive:
- Purchase confirmation
- Download links for each property report
- 7-day link expiration notice
- Professional HTML formatting

---

## 🔒 Security Features

- **Webhook signature verification** - Ensures requests come from Stripe
- **Input validation** - Validates property IDs and email addresses
- **RLS policies** - Database row-level security
- **Rate limiting** - Max 10 properties per purchase
- **Secure secrets** - Environment variables for all API keys

---

## 🚨 Error Handling

The system handles:
- Invalid property IDs
- Payment failures
- PDF generation errors
- Email delivery failures
- Database connectivity issues

---

## 📈 Production Considerations

1. **Switch to live Stripe keys**
2. **Set up proper domain for webhooks**
3. **Configure email DNS (if using custom domain)**
4. **Monitor webhook delivery in Stripe Dashboard**
5. **Set up logging and alerting**
6. **Consider implementing retry logic for failed operations**

---

## 🆘 Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook secret matches
- Check Stripe webhook logs

**PDF generation fails:**
- Verify property IDs exist in database
- Check Supabase function logs
- Ensure all required secrets are set

**Email not sending:**
- Verify Resend API key
- Check email address format
- Monitor Resend dashboard for delivery status

**Database errors:**
- Verify RLS policies are set correctly
- Check service role key permissions
- Ensure migration ran successfully

---

## 🔗 Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Email API](https://resend.com/docs)

---

## 📞 Support

For issues with this implementation, check:
1. Supabase function logs
2. Stripe webhook delivery logs  
3. Database query logs
4. Email delivery status

The system provides comprehensive error logging to help diagnose issues quickly.

