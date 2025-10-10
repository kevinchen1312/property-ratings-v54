# Troubleshooting Missing Report Email

## User: klutchintp2@gmail.com

## Step 1: Run Diagnostic

1. Open your **Supabase SQL Editor**
2. Copy and paste the contents of `diagnose-missing-email-report.sql`
3. Click **Run**
4. Review the results to understand what happened

## Step 2: Interpret Results

### Scenario A: Report Exists, Email Not Sent
**Signs:**
- ✅ Credit transaction shows debit
- ✅ Report redemption record exists
- ❌ `email_sent` = false or NULL
- ✅ `report_url` is present

**Solution:** The report was generated but email failed. Use Option 1 or 2 below.

---

### Scenario B: Report Exists, Email Was Sent
**Signs:**
- ✅ Credit transaction shows debit
- ✅ Report redemption record exists
- ✅ `email_sent` = true
- ✅ `report_url` is present

**Solution:** Email was sent but user didn't receive it. Check:
1. Spam/junk folder
2. Email provider blocking
3. Resend with Option 1 below

---

### Scenario C: No Report Record
**Signs:**
- ✅ Credit transaction shows debit
- ❌ No report redemption record

**Solution:** Payment went through but report wasn't generated. This indicates a webhook failure. See "Manual Report Generation" below.

---

## Step 3: Solution Options

### Option 1: Resend Email Automatically

If the report exists but email wasn't sent:

1. Run `resend-report-email.sql` in Supabase SQL Editor
2. Get the `redemption_id` from the results
3. Update the query with the actual redemption ID
4. Uncomment and run the UPDATE statement

```sql
UPDATE report_redemptions
SET 
    email_sent = false,
    email_sent_at = NULL
WHERE id = 'actual-redemption-id-here';
```

---

### Option 2: Send Report Link Manually

1. Run `diagnose-missing-email-report.sql`
2. Copy the `report_url` from the results
3. Send this email to **klutchintp2@gmail.com**:

```
Subject: Your Property Report

Hi,

Your property report is ready for download:

[PASTE REPORT URL HERE]

This link is valid for 7 days. Please save the report to your device.

If you have any questions, please let us know.

Best regards,
Property Ratings Team
```

---

### Option 3: Manually Generate Report

If no report record exists, you need to generate it:

1. Find which property they tried to purchase (check their recent activity)
2. Call the Supabase Edge Function manually:

```bash
curl -X POST https://[YOUR-PROJECT-ID].supabase.co/functions/v1/redeemReports \
  -H "Authorization: Bearer [YOUR-ANON-KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyIds": ["property-id-here"],
    "email": "klutchintp2@gmail.com"
  }'
```

---

## Step 4: Prevent Future Issues

### Check Email Service Configuration

1. **Resend API Key**: Verify it's configured in Supabase Edge Functions
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Check `RESEND_API_KEY` is set

2. **Email Domain**: Verify sending domain is verified
   - Default: `onboarding@resend.dev` (works but may be flagged as spam)
   - Better: Configure your own domain in Resend

3. **Edge Function Logs**: Check for errors
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for `stripeWebhook` or `emailPropertyReport` errors

---

## Quick Reference

### Table to Check
- `auth.users` - User account
- `credit_transactions` - Purchases and redemptions
- `report_redemptions` - Report generation records
- `property` - Property details

### Key Fields
- `report_redemptions.email_sent` - Was email sent?
- `report_redemptions.report_url` - Download link
- `credit_transactions.transaction_type` - 'debit' = purchase

---

## Contact Support Checklist

If you need to escalate:
- [ ] User email: klutchintp2@gmail.com
- [ ] Purchase timestamp: [from credit_transactions]
- [ ] Property address: [from diagnostic query]
- [ ] Report URL: [from report_redemptions if exists]
- [ ] Error logs: [from Edge Function logs]
- [ ] Steps taken: [list what you tried]

---

## Most Common Issue: Email in Spam

**90% of "missing email" cases are actually in spam/junk folder.**

Ask the user to:
1. Check spam/junk folder
2. Search inbox for "Property Report"
3. Add `onboarding@resend.dev` to contacts
4. If found, mark as "Not Spam"

