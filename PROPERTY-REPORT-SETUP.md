# Property Report Generation Setup

This guide will help you set up the Supabase Edge Function for generating property reports.

## 🗂️ Files Created

1. **`supabase/functions/generatePropertyReport/index.ts`** - Main Edge Function
2. **`supabase/functions/generatePropertyReport/sql-functions.sql`** - Required SQL functions
3. **`scripts/testPropertyReport.ts`** - Local test script
4. **`PROPERTY-REPORT-SETUP.md`** - This setup guide

## 📋 Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase (if not already done)

```bash
supabase init
```

### 3. Set up SQL Functions

Run the SQL functions in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/functions/generatePropertyReport/sql-functions.sql
-- This creates the necessary database functions and storage bucket
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy generatePropertyReport --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

### 5. Set Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and set:

- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Settings > API)

### 6. Test the Function

```bash
npm run test:report
```

## 🔧 Function Features

### Input Parameters
```json
{
  "propertyId": "uuid-of-property"
}
```

### Response
```json
{
  "success": true,
  "property": "Property Name",
  "reportUrl": "https://signed-url-to-pdf",
  "fileName": "property-uuid-report-timestamp.pdf",
  "expiresAt": "2024-01-15T10:30:00.000Z"
}
```

### Report Contents

1. **Property Information**
   - Name, address, coordinates
   - Generation timestamp

2. **Overall Averages**
   - By attribute (noise, friendliness, cleanliness)
   - Combined overall rating

3. **Weekly Trends**
   - Last 8 weeks of data
   - Grouped by week and attribute

4. **Monthly Trends**
   - Last 12 months of data
   - Grouped by month and attribute

5. **Rating Log**
   - Recent rating history
   - Timestamp, attribute, stars, hashed user ID

## 🗄️ SQL Functions Created

- `get_overall_averages(property_id)` - Overall rating averages
- `get_weekly_averages(property_id)` - Weekly trends (8 weeks)
- `get_monthly_averages(property_id)` - Monthly trends (12 months)
- `get_rating_log(property_id)` - Rating history with hashed user IDs

## 📁 Storage Setup

- **Bucket**: `reports`
- **Access**: Private with signed URLs
- **Retention**: 7-day signed URLs
- **File naming**: `property-{id}-report-{timestamp}.pdf`

## 🧪 Testing

1. Ensure you have properties with ratings in your database
2. Run the test script: `npm run test:report`
3. Check the generated PDF URL
4. Verify the PDF downloads correctly

## 🔒 Security

- Uses service role for database access
- Hashes user IDs in reports for privacy
- Private storage with time-limited signed URLs
- CORS headers configured for web access

## 🚀 Usage in Your App

You can call this function from your React Native app:

```typescript
const generateReport = async (propertyId: string) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generatePropertyReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ propertyId })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Open PDF URL or share it
    Linking.openURL(result.reportUrl);
  }
};
```

## 📊 Performance Notes

- Reports are generated on-demand
- PDF generation uses pdf-lib (lightweight)
- Rating log limited to 100 most recent entries
- Functions use proper indexing for performance
- Storage URLs expire after 7 days for security

## 🐛 Troubleshooting

1. **Function deployment fails**: Check Supabase CLI login and project ref
2. **SQL function errors**: Ensure all SQL functions are created
3. **Storage errors**: Verify bucket exists and RLS policies are correct
4. **PDF generation fails**: Check memory limits and data size
5. **Test script fails**: Verify environment variables and property data exists

