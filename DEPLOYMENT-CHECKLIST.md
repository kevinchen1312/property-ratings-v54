# ✅ Deployment Checklist

Print this or keep it open while deploying!

## Prerequisites
- [ ] I have Node.js installed (check: `node --version`)
- [ ] I have npm installed (check: `npm --version`)
- [ ] I have a Vercel account (free: https://vercel.com/signup)
- [ ] I have a Supabase account (already have one ✓)
- [ ] I have Resend API key set up in Supabase

---

## Part 1: Vercel Deployment (15 min)

### Setup
- [ ] Installed Vercel CLI: `npm install -g vercel`
- [ ] Verified installation: `vercel --version`
- [ ] Logged into Vercel: `vercel login`
- [ ] Browser opened and logged in successfully

### Deploy
- [ ] Navigated to pdf-service folder
- [ ] Ran `npm install` (dependencies installed)
- [ ] Ran `vercel --prod`
- [ ] Answered deployment questions
- [ ] Deployment succeeded
- [ ] **Copied deployment URL:**
  ```
  https://_________________________________.vercel.app
  ```

### Test (Optional but Recommended)
- [ ] Tested API endpoint with curl/Postman
- [ ] Received JSON response with `success: true`

---

## Part 2: Supabase Configuration (5 min)

### Environment Variables
- [ ] Opened Supabase Dashboard
- [ ] Navigated to: Project Settings → Edge Functions
- [ ] Added environment variable:
  - Name: `PDF_SERVICE_URL` ✓
  - Value: `https://YOUR-URL.vercel.app/api/generate-pdf` ✓
- [ ] Clicked **Save**
- [ ] Variable appears in list

### Existing Variables (Verify)
- [ ] `RESEND_API_KEY` is set
- [ ] `REPORTS_FROM_EMAIL` is set

---

## Part 3: Supabase Function Deployment (5 min)

### Prepare
- [ ] Navigated to project root folder
- [ ] Backed up old file (optional):
  ```powershell
  cp supabase/functions/redeemReports/index.ts supabase/functions/redeemReports/index.ts.backup
  ```
- [ ] Replaced with new version:
  ```powershell
  cp supabase/functions/redeemReports/index-new.ts supabase/functions/redeemReports/index.ts
  ```

### Deploy
- [ ] Ran `supabase functions deploy redeemReports`
- [ ] Deployment succeeded (saw "✓ Function deployed successfully")
- [ ] Verified in Supabase Dashboard:
  - Edge Functions → redeemReports
  - Status: **Active** ✓
  - Last deployed: Recent timestamp ✓

---

## Part 4: Testing (10 min)

### Mobile App Test
- [ ] Opened mobile app
- [ ] Selected a property with good data (50+ ratings)
- [ ] Tapped "Purchase Report" or equivalent
- [ ] Entered email address
- [ ] Submitted request
- [ ] Waited 6-8 seconds

### Email Verification
- [ ] Received email (checked inbox)
- [ ] If not in inbox, checked spam folder
- [ ] Email subject: "Your Community Observation Report for [Property]"
- [ ] Email has professional HTML design
- [ ] Email has PDF attachment

### PDF Verification
- [ ] Downloaded/opened PDF
- [ ] Title: "Community Observation Report" ✓
- [ ] Property address shown ✓
- [ ] **Insights section** with blue box and bullets ✓
- [ ] **Overall Rating Summary** table ✓
- [ ] **Monthly Rating Summary** tables (if data exists) ✓
- [ ] **Daily Rating Trends** - 3 charts with **ORANGE LINES** ✓
- [ ] **Time-of-Day Trends** - 3 charts with **ORANGE LINES** ✓
- [ ] **Daily Logs** tables with data ✓
- [ ] **Disclaimer** at bottom ✓
- [ ] No blank pages or errors ✓

---

## Part 5: Log Verification (Optional)

### Vercel Logs
- [ ] Ran `vercel logs` in pdf-service folder
- [ ] Saw successful PDF generation messages
- [ ] No errors in output

### Supabase Logs
- [ ] Ran `supabase functions logs redeemReports`
- [ ] Saw messages:
  - "Calling Vercel PDF service at..." ✓
  - "PDF generated successfully, size: X bytes" ✓
  - "PDF email sent successfully" ✓
- [ ] No errors in output

---

## Part 6: Multiple Property Test

### Test Various Scenarios
- [ ] Tested property with lots of data (100+ ratings)
  - Result: ________________
- [ ] Tested property with medium data (20-50 ratings)
  - Result: ________________
- [ ] Tested property with minimal data (5-10 ratings)
  - Result: ________________

### Credits & Revenue
- [ ] Credits properly deducted
- [ ] Revenue sharing processed (if applicable)
- [ ] No duplicate charges

---

## 🎉 Success Criteria

All these should be checked:
- [ ] Vercel deployment is live and accessible
- [ ] Supabase function deployed and active
- [ ] Environment variables set correctly
- [ ] Mobile app can request reports
- [ ] Emails arrive within 10 seconds
- [ ] PDFs open without errors
- [ ] PDFs have new format (not old "Property Rating Report")
- [ ] Charts show with orange lines (not blank)
- [ ] All sections render correctly
- [ ] No errors in logs

---

## 🚨 If Something Failed

### Vercel Issues
- [ ] Checked Vercel logs: `vercel logs`
- [ ] Verified deployment URL is correct
- [ ] Tested API endpoint directly
- [ ] Tried redeploying: `vercel --prod`

### Supabase Issues
- [ ] Checked Supabase logs: `supabase functions logs redeemReports`
- [ ] Verified `PDF_SERVICE_URL` is set correctly
- [ ] Tried redeploying: `supabase functions deploy redeemReports`
- [ ] Verified I'm logged in: `supabase login`

### PDF Issues
- [ ] Charts not rendering → Need more rating data
- [ ] Old format → Clear app cache, redeploy function
- [ ] Blank pages → Check logs for errors
- [ ] Email not arriving → Check spam, verify RESEND_API_KEY

---

## 📝 Notes

**Deployment Date:** _____________________

**Vercel URL:** _____________________

**Issues Encountered:**
_________________________________________________
_________________________________________________
_________________________________________________

**Solutions Applied:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## 🎯 Next Steps After Success

- [ ] Monitor system for 24 hours
- [ ] Test with 5-10 different properties
- [ ] Check Vercel usage in dashboard
- [ ] Check Supabase function invocations
- [ ] Document any custom changes made
- [ ] Set up monitoring alerts (optional)
- [ ] Add API key to Vercel endpoint (optional, for production)

---

## 📞 Help Resources

- **Detailed Guide:** `VERCEL-DEPLOYMENT-GUIDE.md`
- **Quick Commands:** `QUICK-DEPLOY-COMMANDS.md`
- **Technical Details:** `FINAL-SOLUTION-SUMMARY.md`

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Logs:** Always check logs first!

---

**Status:** ⏳ In Progress / ✅ Complete / ❌ Failed

**Overall Result:**
- [ ] ✅ Deployment successful - system working!
- [ ] ⚠️ Partial success - some issues to resolve
- [ ] ❌ Failed - need help

**Time Spent:** _________ minutes

**Ready for Production:** [ ] Yes  [ ] No  [ ] Needs testing


