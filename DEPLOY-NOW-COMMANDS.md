# 🚀 Quick Deploy Commands - Copy & Paste!

## Step 1: Install Dependencies
```powershell
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54\pdf-service"
npm install
```

## Step 2: Deploy to Vercel
```powershell
vercel --prod
```

## Step 3: Copy Your New URL
After deployment, you'll see:
```
✅  Production: https://leadsong-pdf-service.vercel.app
```

**Copy that URL!**

## Step 4: Update Supabase Environment Variable
```powershell
# Option A: Use Supabase CLI
supabase secrets set PDF_SERVICE_URL=https://YOUR-URL-HERE.vercel.app/api/generate-pdf

# Option B: Use Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Your Project → Settings → Edge Functions → Environment Variables
# 3. Find PDF_SERVICE_URL
# 4. Update to: https://YOUR-URL-HERE.vercel.app/api/generate-pdf
```

## Step 5: Deploy Supabase Function
```powershell
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"
supabase functions deploy redeemReports
```

## Step 6: Test!
Open your mobile app → Select property → Request report → Check email

---

## Quick Test Command
```powershell
$body = '{"property":{"address":"Test Property, 123 Main St"},"insights":["Test"],"overallSummary":[{"attribute":"Quietness","avg":4.2,"count":10}],"monthlySummary":[],"dailyTrends":{"quietness":[{"date":"2025-01-01","avg":4}],"cleanliness":[{"date":"2025-01-01","avg":4}],"safety":[{"date":"2025-01-01","avg":4}]},"hourlyTrends":{"quietness":[{"hour":9,"avg":4}],"cleanliness":[{"hour":9,"avg":4}],"safety":[{"hour":9,"avg":4}]},"dailyLogs":[]}'

Invoke-WebRequest -Uri "https://leadsong-pdf-service.vercel.app/api/generate-pdf" -Method POST -Body $body -ContentType "application/json"
```

**Expected:** `"success": true` in response

---

## That's It! 🎉

**Total time:** 5-10 minutes  
**Commands:** 6 total  
**Result:** Production-ready PDF service with charts!


