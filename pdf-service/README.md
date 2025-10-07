# Leadsong PDF Generation Service

This is a Node.js serverless function that generates PDF reports using Puppeteer. It's designed to run on Vercel and be called from your Supabase Edge Functions.

## Why This Exists

Supabase Edge Functions run on Deno, which doesn't support Puppeteer (a Node.js library). This service runs on Vercel's Node.js runtime to handle the PDF generation.

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy the Service
```bash
cd pdf-service
vercel --prod
```

### 4. Note Your Deployment URL
After deployment, Vercel will give you a URL like:
```
https://your-project-name.vercel.app
```

Your API endpoint will be:
```
https://your-project-name.vercel.app/api/generate-pdf
```

### 5. Add to Supabase Environment Variables
Go to your Supabase Dashboard:
- Project Settings → Edge Functions
- Add environment variable:
  - Name: `PDF_SERVICE_URL`
  - Value: `https://your-project-name.vercel.app/api/generate-pdf`

## Testing Locally

```bash
cd pdf-service
npm install
vercel dev
```

Test endpoint:
```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "property": { "address": "123 Test St" },
    "insights": ["Test insight"],
    "overallSummary": [],
    "monthlySummary": [],
    "dailyTrends": { "quietness": [], "cleanliness": [], "safety": [] },
    "hourlyTrends": { "quietness": [], "cleanliness": [], "safety": [] },
    "dailyLogs": []
  }'
```

## API Endpoint

### POST /api/generate-pdf

**Request Body:**
```json
{
  "property": {
    "name": "Property Name",
    "address": "123 Main St, City, State 12345"
  },
  "insights": ["Insight 1", "Insight 2"],
  "overallSummary": [
    { "attribute": "Quietness", "avg": 4.2, "count": 150 }
  ],
  "monthlySummary": [
    {
      "label": "June 2025",
      "rows": [
        { "attribute": "Quietness", "avg": 4.1, "count": 50 }
      ]
    }
  ],
  "dailyTrends": {
    "quietness": [{ "date": "2025-06-01", "avg": 4.0 }],
    "cleanliness": [],
    "safety": []
  },
  "hourlyTrends": {
    "quietness": [{ "hour": 9, "avg": 4.0 }],
    "cleanliness": [],
    "safety": []
  },
  "dailyLogs": [
    {
      "date": "2025-06-01",
      "rows": [
        {
          "created_at": "2025-06-01T09:00:00Z",
          "attribute": "quietness",
          "stars": 4,
          "user_hash": "abc123"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "pdf": "base64_encoded_pdf_data",
  "size": 123456
}
```

## Environment Variables

None required for this service. All configuration is done in the calling Supabase function.

## Cost

Vercel Free Tier includes:
- 100 GB bandwidth/month
- 100 hours serverless function execution/month
- Plenty for moderate usage

## Troubleshooting

### PDF generation fails
- Check Vercel logs: `vercel logs`
- Ensure all required data fields are present
- Verify Chart.js CDN is accessible

### Charts not rendering
- The function waits for `window.__chartsReady` signal
- Has 2-second fallback timeout
- Check browser console in generated PDF

### Deployment fails
- Ensure you're logged in: `vercel login`
- Check `package.json` is valid
- Verify Node.js version >= 18


