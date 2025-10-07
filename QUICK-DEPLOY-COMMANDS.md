# ⚡ Quick Deploy Commands

Copy and paste these commands to deploy the new PDF system.

## 1️⃣ Deploy Vercel PDF Service

```powershell
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to pdf-service folder
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54\pdf-service"

# Install dependencies
npm install

# Deploy to production
vercel --prod
```

**📝 Copy your deployment URL!** It will look like:
```
https://leadsong-pdf-service.vercel.app
```

---

## 2️⃣ Add Environment Variable to Supabase

1. Go to https://supabase.com/dashboard
2. Project Settings → Edge Functions
3. Add Environment Variable:
   - **Name:** `PDF_SERVICE_URL`
   - **Value:** `https://YOUR-VERCEL-URL.vercel.app/api/generate-pdf`

---

## 3️⃣ Deploy Supabase Function

```powershell
# Navigate to project root
cd "C:\Users\ucric\leadsong v2.5\property-ratings-v54"

# Backup old file (optional)
cp supabase/functions/redeemReports/index.ts supabase/functions/redeemReports/index.ts.backup

# Replace with new version
cp supabase/functions/redeemReports/index-new.ts supabase/functions/redeemReports/index.ts

# Deploy to Supabase
supabase functions deploy redeemReports
```

---

## 4️⃣ Test It!

1. Open mobile app
2. Request a report
3. Check your email
4. Open the PDF

---

## 🔍 Check Logs

**Vercel logs:**
```powershell
cd pdf-service
vercel logs
```

**Supabase logs:**
```powershell
supabase functions logs redeemReports --tail
```

---

## ✅ What Success Looks Like

**Email subject:**
```
Your Community Observation Report for [Property Name]
```

**PDF has:**
- Title: "Community Observation Report"
- Blue insights box
- Rating tables
- 6 orange-line charts
- Daily logs
- Disclaimer

---

## 🚨 If Something Goes Wrong

**Vercel deployment fails:**
```powershell
vercel login
cd pdf-service
npm install
vercel --prod
```

**Supabase deployment fails:**
```powershell
supabase login
supabase link
supabase functions deploy redeemReports
```

**Function works but PDF looks wrong:**
- Check logs: `vercel logs` and `supabase functions logs redeemReports`
- Verify `PDF_SERVICE_URL` is set in Supabase Dashboard
- Test with property that has 100+ ratings

---

## 📋 Environment Variables Needed

**In Supabase Dashboard:**
- `PDF_SERVICE_URL` → `https://your-vercel-url.vercel.app/api/generate-pdf`
- `RESEND_API_KEY` → Your Resend API key
- `REPORTS_FROM_EMAIL` → `reports@yourdomain.com`

---

## Total Deployment Time

- Vercel deploy: 5 minutes
- Supabase setup: 5 minutes
- Testing: 3 minutes
- **Total: ~15 minutes**

---

See `VERCEL-DEPLOYMENT-GUIDE.md` for detailed step-by-step instructions.


