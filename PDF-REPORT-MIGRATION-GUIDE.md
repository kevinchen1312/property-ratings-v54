# PDF Report System Migration Guide

## Overview

The PDF report generation system has been migrated from **jsPDF** to **HTML/CSS + Puppeteer** to support complex layouts with charts and better match the Mock Community Observation Report design.

## What Changed

### Before (jsPDF)
- Used jsPDF library for programmatic PDF generation
- Limited chart support
- Manual positioning and layout calculations
- Basic table structures

### After (HTML/CSS + Puppeteer)
- Uses HTML templates with CSS for layout
- Chart.js integration for interactive charts
- Automatic page breaks with repeating table headers
- Professional styling matching the mock report

## New Report Structure

The generated PDF now follows this exact section order:

1. **Title Block**
   - H1: "Community Observation Report"
   - Address line (property address)

2. **Insights (Bulleted)**
   - Auto-generated insights based on data patterns
   - 3-5 concise bullets highlighting key findings

3. **Overall Rating Summary (Averages Across All Users)**
   - Table with columns: Attribute, Avg. Rating ("x.xx / 5"), Total Ratings
   - Attributes: Quietness, Cleanliness, Safety

4. **Monthly Rating Summary**
   - Separate table for each month with data
   - Same 3-column structure as overall summary

5. **Daily Rating Trends — Charts**
   - Three line charts showing daily averages over time
   - One chart each for: Quietness, Cleanliness, Safety
   - Rendered using Chart.js

6. **Time-of-Day Trends — Charts**
   - Three line charts showing averages by hour of day (0-23)
   - Same three attributes as above

7. **Daily Logs (Selected Dates)**
   - Tables grouped by date
   - Columns: Time, User, Quietness, Cleanliness, Safety
   - Headers repeat on page breaks
   - Ratings displayed as "n/5"

8. **Disclaimer / Footer**
   - Small-print disclaimer paragraph

## Key Features

### Page Layout
- **US Letter size** (8.5" × 11")
- **0.6 inch margins** on all sides
- Clean sans-serif font (system fonts)
- Consistent spacing using 4/8/12/16/24/32px scale

### Tables
- Fixed column widths
- Hairline borders (#ddd)
- Zebra striping (alternating row colors)
- Headers repeat automatically on page breaks

### Charts
- Server-side rendering with Chart.js
- Thin lines, round dots, subtle grid
- Left-aligned titles above each chart
- Minimal legends (omitted where obvious)
- Charts arranged in neat 3-column grid
- Consistent sizing and aspect ratios

### Data Processing

#### Attribute Mapping
The system now maps legacy attributes to the new standard:
- `noise` → `Quietness`
- `cleanliness` → `Cleanliness`
- `safety` → `Safety`
- `friendliness` → `Safety` (legacy mapping)

#### Insights Generation
Automated insights are generated based on:
- Day-of-week and time-of-day patterns
- Recurring dips or spikes in ratings
- Consistency across different attributes

#### Daily Logs
Ratings are grouped by:
1. Date
2. Time and user
3. Consolidated into single rows showing all attributes

## Technical Implementation

### Dependencies
```typescript
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'
```

### Chart Libraries (CDN)
- Chart.js v4.4.0
- chartjs-adapter-date-fns v3.0.0

### PDF Generation Flow

1. Fetch property and rating data from Supabase
2. Process data:
   - Calculate overall averages
   - Group by month
   - Calculate daily trends
   - Calculate hourly trends
   - Group ratings by date for logs
3. Generate HTML content with embedded data
4. Launch Puppeteer browser
5. Render HTML to PDF with proper page settings
6. Upload PDF to Supabase Storage
7. Email PDF to user

### Browser Configuration
```typescript
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const pdfBuffer = await page.pdf({
  format: 'letter',
  printBackground: true,
  margin: {
    top: '0.6in',
    right: '0.6in',
    bottom: '0.6in',
    left: '0.6in'
  }
});
```

## Data Contract

The system expects these data structures:

```typescript
interface ReportData {
  property: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  insights: string[];
  overallSummary: Array<{
    attribute: 'Quietness' | 'Cleanliness' | 'Safety';
    avg: number;
    count: number;
  }>;
  monthlySummary: Array<{
    label: string; // "June 2025"
    rows: Array<{
      attribute: string;
      avg: number | null;
      count: number;
    }>;
  }>;
  dailyTrends: {
    quietness: Array<{ date: string; avg: number }>;
    cleanliness: Array<{ date: string; avg: number }>;
    safety: Array<{ date: string; avg: number }>;
  };
  hourlyTrends: {
    quietness: Array<{ hour: number; avg: number }>;
    cleanliness: Array<{ hour: number; avg: number }>;
    safety: Array<{ hour: number; avg: number }>;
  };
  dailyLogs: Array<{
    date: string;
    rows: Array<{
      created_at: string;
      attribute: string;
      stars: number;
      user_hash?: string;
      user_id?: string;
    }>;
  }>;
}
```

## Styling Guidelines

### Typography
- **H1 (Title):** 28pt, bold, black
- **H2 (Sections):** 18pt, semi-bold, 32px top margin
- **H3 (Subsections):** 14pt, semi-bold, 24px top margin
- **Body:** 11pt, regular
- **Disclaimer:** 9pt, gray

### Colors
- **Primary Blue:** #007bff (insights box border)
- **Table Header:** #4a90e2
- **Chart Line:** #f0ad4e (orange)
- **Text:** #212529 (dark gray)
- **Muted Text:** #6c757d

### Spacing
- Section margins: 24-32px
- Table padding: 8-12px
- Chart grid gap: 24px

## Testing

To test the PDF generation:

1. Ensure property has sufficient rating data across multiple dates and times
2. Call the `emailPropertyReport` function with `propertyId` and `userEmail`
3. Verify the generated PDF matches the mock structure
4. Check all sections render correctly
5. Verify charts display properly with data
6. Confirm page breaks work correctly in daily logs

## Troubleshooting

### Charts Not Rendering
- Ensure Chart.js CDN is accessible
- Check browser console for JavaScript errors
- Verify data format matches expected structure
- Increase wait timeout if needed

### Page Breaks Issues
- Adjust `page-break-inside: avoid` on containers
- Check table header `display: table-header-group`
- Verify margin settings in PDF options

### Missing Data
- Check that database RPC functions return data
- Verify attribute mapping is working correctly
- Ensure date parsing is handling timezones properly

## Future Enhancements

Potential improvements:
- Add more sophisticated insight generation algorithms
- Include trend arrows (↑↓) in summary tables
- Add color coding for rating levels (green/yellow/red)
- Include photos from ratings (if available)
- Multi-language support
- Custom branding options

## Migration Notes

- Old jsPDF-based reports are no longer generated
- Existing reports in storage remain unchanged
- Email templates updated to reflect new report features
- No changes to the public API (same function signature)


