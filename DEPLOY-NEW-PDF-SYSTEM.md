# Deployment Guide: New PDF Report System

## 🚀 Quick Deployment

The new PDF generation system has been implemented in **TWO** Supabase Edge Functions that need to be deployed:

### 1. Primary Function (Mobile App Uses This!)
```bash
supabase functions deploy redeemReports
```
This is the **main function** that the mobile app calls when users request reports.

### 2. Secondary Function (Email Reports)
```bash
supabase functions deploy emailPropertyReport
```
This function handles direct email report requests (if used).

## ✅ What Changed

Both functions have been migrated from **jsPDF** to **HTML/CSS + Puppeteer** to generate the new "Community Observation Report" format.

### Key Changes:
- ✅ New report title: "Community Observation Report"
- ✅ New structure: Insights, Overall Summary, Monthly Summary, Charts, Daily Logs
- ✅ Professional charts using Chart.js
- ✅ US Letter format with 0.6" margins
- ✅ Repeating table headers on page breaks
- ✅ Auto-generated insights from data patterns

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] You have Supabase CLI installed
- [ ] You're logged in: `supabase login`
- [ ] Your project is linked: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Environment variables are set in Supabase Dashboard:
  - `RESEND_API_KEY` - For email sending
  - `REPORTS_FROM_EMAIL` - From email address

## 🎯 Deployment Steps

### Step 1: Deploy Both Functions
```bash
# Deploy the primary function (used by mobile app)
supabase functions deploy redeemReports

# Deploy the secondary function (for direct email reports)
supabase functions deploy emailPropertyReport
```

### Step 2: Verify Deployment
Check the Supabase Dashboard:
1. Go to **Edge Functions** section
2. Verify both functions show as "Active"
3. Check the logs for any deployment errors

### Step 3: Test the New System

#### Test from Mobile App:
1. Open the mobile app
2. Select a property
3. Request a report
4. Check your email for the PDF

#### Expected Result:
- ✅ Email subject: "Your Community Observation Report for [Property]"
- ✅ PDF title: "Community Observation Report"
- ✅ PDF includes: Insights, Charts, Daily Logs
- ✅ Charts render correctly with data
- ✅ Tables have proper formatting

## 🔍 Troubleshooting

### Issue: Charts Not Rendering
**Solution:** Puppeteer needs time to render JavaScript. The functions include a 2-second wait time.

### Issue: PDF Generation Fails
**Possible Causes:**
1. Insufficient memory - Puppeteer is memory-intensive
2. Missing Chart.js CDN access
3. Invalid data format

**Check Logs:**
```bash
supabase functions logs redeemReports
```

### Issue: Old PDF Format Still Appears
**Cause:** Function wasn't deployed or cached version being used

**Solution:**
1. Verify deployment: Check Supabase Dashboard
2. Hard refresh the app (clear cache)
3. Re-deploy the function

### Issue: "Property Not Found" Error
**Cause:** Database RPC functions missing

**Solution:**
Ensure these RPC functions exist in your database:
- `get_rating_log`
- `get_overall_averages`
- `get_monthly_averages`

## 📊 Monitoring

### Monitor PDF Generation Success Rate

Check function logs for:
```
✅ "PDF generated successfully"
✅ "PDF email sent successfully"
```

### Monitor Performance

Typical execution time:
- Data fetching: ~500ms
- PDF generation: ~3-5 seconds (includes chart rendering)
- Email sending: ~500ms
- **Total: ~4-6 seconds**

## 🔄 Rollback Plan

If you need to rollback to the old system:

### Option 1: Redeploy Old Code
```bash
git checkout <commit-before-changes>
supabase functions deploy redeemReports
supabase functions deploy emailPropertyReport
```

### Option 2: Quick Fix
The functions are independent - you can rollback one at a time if needed.

## 📝 Post-Deployment Checklist

After deployment, verify:

- [ ] Test report generation from mobile app
- [ ] Check email arrives with new format
- [ ] Open PDF and verify all sections render correctly
- [ ] Verify charts display properly
- [ ] Check daily logs have repeating headers
- [ ] Confirm insights are auto-generated
- [ ] Test with multiple properties
- [ ] Monitor function logs for errors

## 💡 Tips

1. **Test with Properties That Have Data:** Charts need data to render properly
2. **Check Email Spam Folder:** New subject line might trigger filters
3. **PDF Rendering Takes Time:** Allow 4-6 seconds for generation
4. **Memory Usage:** Puppeteer is memory-intensive; monitor function memory

## 🆘 Support

If you encounter issues:

1. Check function logs: `supabase functions logs redeemReports`
2. Review error messages in Supabase Dashboard
3. Verify environment variables are set correctly
4. Test with a known good property (one with lots of ratings)

## ✨ Success Indicators

You'll know the deployment was successful when:

1. ✅ Email subject line reads "Your Community Observation Report..."
2. ✅ PDF opens and shows "Community Observation Report" as title
3. ✅ Insights section appears with bullet points
4. ✅ Charts render with orange lines
5. ✅ Daily logs show data grouped by date
6. ✅ Tables have alternating row colors
7. ✅ No console errors in function logs

---

**Deployment Status:** Ready to deploy  
**Estimated Downtime:** None (rolling update)  
**Risk Level:** Low (functions are independent)


