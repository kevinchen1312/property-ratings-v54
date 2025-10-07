# 🚀 Complete Deployment Guide: Vercel + Supabase PDF System

This guide walks you through deploying the new PDF generation system that uses Vercel (Node.js) for PDF generation and Supabase (Deno) for data processing and emailing.

## 📋 Overview

**Architecture:**
```
Mobile App 
  ↓
Supabase Edge Function (Deno)
  ↓ Fetches data, processes it
  ↓ Calls →
Vercel API (Node.js + Puppeteer)
  ↓ Generates PDF with charts
  ↓ Returns PDF
Supabase Edge Function
  ↓ Emails PDF via Resend
User receives email with PDF
```

## Part 1: Deploy Vercel PDF Service (15 minutes)

### Step 1: Install Vercel CLI

**Windows (using npm):**
```powershell
npm install -g vercel
```

**Verify installation:**
```powershell
vercel --version
```

### Step 2: Login to Vercel

```powershell
vercel login
```

This will open your browser. Log in with:
- GitHub account (recommended)
- GitLab
- Bitbucket
- or Email

### Step 3: Navigate to PDF Service Folder

```powershell
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54\pdf-service"
```

### Step 4: Install Dependencies

```powershell
npm install
```

This installs:
- `puppeteer` - For PDF generation
- `chrome-aws-lambda` - Chromium binary for serverless

### Step 5: Deploy to Vercel

```powershell
vercel --prod
```

**What you'll see:**
```
? Set up and deploy "pdf-service"? [Y/n] Y
? Which scope do you want to deploy to? (Your Account)
? Link to existing project? [y/N] N
? What's your project's name? leadsong-pdf-service
? In which directory is your code located? ./
```

**Answer:**
- Y (yes, deploy)
- Choose your account
- N (new project)
- Enter: `leadsong-pdf-service`
- Enter: `./` (current directory)

**Deployment will take 2-3 minutes...**

### Step 6: Note Your Deployment URL

After deployment, you'll see:
```
✅ Production: https://leadsong-pdf-service.vercel.app [copied to clipboard]
```

**IMPORTANT:** Copy this URL! You'll need it for Step 7.

Your PDF API endpoint is:
```
https://leadsong-pdf-service.vercel.app/api/generate-pdf
```

### Step 7: Test the Vercel API (Optional but Recommended)

**Test with a simple request:**
```powershell
# Create a test file
$testData = @{
  property = @{
    name = "Test Property"
    address = "123 Test St, Test City, TS 12345"
  }
  insights = @("Test insight 1", "Test insight 2")
  overallSummary = @()
  monthlySummary = @()
  dailyTrends = @{
    quietness = @()
    cleanliness = @()
    safety = @()
  }
  hourlyTrends = @{
    quietness = @()
    cleanliness = @()
    safety = @()
  }
  dailyLogs = @()
} | ConvertTo-Json -Depth 10

# Test the API
Invoke-WebRequest -Uri "https://leadsong-pdf-service.vercel.app/api/generate-pdf" `
  -Method POST `
  -Body $testData `
  -ContentType "application/json"
```

**Expected:** Status code 200 and JSON response with `success: true`

---

## Part 2: Update Supabase Edge Functions (10 minutes)

### Step 8: Add Vercel URL to Supabase Environment Variables

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Project Settings** (gear icon bottom left)
4. Click **Edge Functions** in the left menu
5. Scroll to **Environment Variables**
6. Click **Add Variable**
   - **Name:** `PDF_SERVICE_URL`
   - **Value:** `https://leadsong-pdf-service.vercel.app/api/generate-pdf`
7. Click **Save**

### Step 9: Replace the Supabase Function File

**Backup the old file first:**
```powershell
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"
cp supabase/functions/redeemReports/index.ts supabase/functions/redeemReports/index.ts.backup
```

**Replace with new version:**
```powershell
cp supabase/functions/redeemReports/index-new.ts supabase/functions/redeemReports/index.ts
```

### Step 10: Deploy Supabase Function

```powershell
supabase functions deploy redeemReports
```

**Expected output:**
```
Deploying Function redeemReports...
✓ Function deployed successfully
```

**If you get errors:**
- Make sure you're logged in: `supabase login`
- Make sure project is linked: `supabase link`
- Check you're in the right directory

### Step 11: Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in left menu
4. Find `redeemReports`
5. Status should be **Active**
6. Click on it to see details
7. Verify **Last deployed** shows current timestamp

---

## Part 3: Test the Complete System (5 minutes)

### Step 12: Test from Mobile App

1. **Open your mobile app**
2. **Select a property** with good rating data (50+ ratings recommended)
3. **Request a report**
4. **Wait 6-8 seconds** (first request after deployment may be slower)
5. **Check your email**

### Step 13: Verify the PDF

**Email should have:**
- ✅ Subject: "Your Community Observation Report for [Property Name]"
- ✅ Professional HTML email
- ✅ PDF attachment

**PDF should have:**
- ✅ Title: "Community Observation Report"
- ✅ Property address
- ✅ Insights section (blue box with bullets)
- ✅ Overall Rating Summary table
- ✅ Monthly Rating Summary tables
- ✅ 6 charts (3 daily trends, 3 hourly trends) with **orange lines**
- ✅ Daily logs tables
- ✅ Disclaimer at bottom

### Step 14: Check Logs (If Issues)

**Vercel logs:**
```powershell
# In pdf-service folder
vercel logs
```

**Supabase logs:**
```powershell
supabase functions logs redeemReports --tail
```

Look for:
- ✅ "Calling Vercel PDF service at..."
- ✅ "PDF generated successfully, size: X bytes"
- ✅ "PDF email sent successfully"

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Vercel deployment succeeded
- [ ] Vercel URL is accessible
- [ ] `PDF_SERVICE_URL` environment variable is set in Supabase
- [ ] Supabase function deployed successfully
- [ ] Mobile app can request reports
- [ ] Email arrives within 10 seconds
- [ ] Email subject mentions "Community Observation Report"
- [ ] PDF opens without errors
- [ ] PDF has new format with charts
- [ ] Charts show orange lines (not gray/black)
- [ ] All sections render correctly
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

---

## 🚨 Troubleshooting

### Problem: Vercel deployment fails

**Error: "Command not found: vercel"**
- Solution: `npm install -g vercel`

**Error: "Not logged in"**
- Solution: `vercel login`

**Error: "Missing dependencies"**
- Solution: `cd pdf-service && npm install`

### Problem: Supabase function fails with "PDF service failed: 500"

**Check Vercel logs:**
```powershell
cd pdf-service
vercel logs --follow
```

**Common causes:**
- Missing data in request
- Chart.js CDN not loading
- Puppeteer timeout

**Fix:** Check Vercel logs for specific error

### Problem: Charts don't render in PDF

**Symptoms:** PDF generates but charts are blank

**Causes:**
1. Not enough data (need multiple dates/hours)
2. Chart.js not loading
3. Timeout too short

**Solution:**
- Test with property that has 100+ ratings
- Check Vercel logs for Chart.js errors
- Increase wait time in `api/generate-pdf.js` (line with `waitForTimeout`)

### Problem: Old PDF format still appears

**Cause:** Function not deployed or cached

**Solutions:**
1. Verify Supabase deployment:
   ```powershell
   supabase functions deploy redeemReports
   ```

2. Check environment variable `PDF_SERVICE_URL` is set

3. Force app to clear cache (restart app)

4. Test directly:
   ```powershell
   supabase functions invoke redeemReports --no-verify-jwt --body '{
     "propertyIds": ["your-property-id"],
     "email": "your@email.com"
   }'
   ```

### Problem: "PDF_SERVICE_URL is not set"

**Cause:** Environment variable missing

**Solution:**
1. Go to Supabase Dashboard
2. Project Settings → Edge Functions
3. Add `PDF_SERVICE_URL` environment variable
4. Redeploy function: `supabase functions deploy redeemReports`

### Problem: "Insufficient credits" or "Unauthorized"

**Cause:** Not related to PDF system - user/auth issue

**Solution:** Check user has credits and valid auth token

---

## 💰 Cost Estimates

### Vercel Free Tier
- ✅ **100 GB bandwidth/month** (plenty for PDFs)
- ✅ **100 hours function execution/month**
- ✅ Estimate: ~500-1000 reports/month on free tier

### Supabase
- No additional cost - using existing Edge Functions quota

**Total cost for moderate usage: $0/month** ✅

---

## 📊 Monitoring

### Check Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click on your project (`leadsong-pdf-service`)
3. Check:
   - Deployment status
   - Function invocations
   - Error rate
   - Bandwidth usage

### Check Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Your project → Edge Functions
3. Click `redeemReports`
4. View:
   - Invocations
   - Error rate
   - Logs

---

## 🔄 Updating the System

### To Update PDF Template:

1. Edit `pdf-service/api/generate-pdf.js`
2. Deploy:
   ```powershell
   cd pdf-service
   vercel --prod
   ```

### To Update Data Processing:

1. Edit `supabase/functions/redeemReports/index.ts`
2. Deploy:
   ```powershell
   supabase functions deploy redeemReports
   ```

---

## 🎉 You're Done!

Your PDF system is now live! The mobile app will:
1. Request reports → Supabase function
2. Supabase fetches data → Calls Vercel API
3. Vercel generates beautiful PDF with charts
4. Supabase emails PDF to user
5. User receives professional "Community Observation Report"

**Need help?** Check the logs first:
- Vercel: `vercel logs`
- Supabase: `supabase functions logs redeemReports`


