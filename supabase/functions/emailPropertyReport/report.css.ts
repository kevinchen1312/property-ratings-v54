/**
 * PDF Report CSS as exportable string
 */

export const reportCSS = `
/* Page Setup */
@page {
  size: letter;
  margin: 36pt 36pt 36pt 36pt;
}

/* Global Resets */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Body & Typography */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #212529;
  padding: 24px 24px 32px;
}

h1 {
  font-size: 24pt;
  font-weight: 700;
  margin-bottom: 8px;
  color: #000;
  text-align: center;
}

h2 {
  font-size: 18pt;
  font-weight: 700;
  margin: 40px 0 20px 0;
  color: #000;
  text-align: left;
}

h3 {
  font-size: 12pt;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #000;
  text-align: left;
}

h4 {
  font-size: 11pt;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
  text-align: left;
}

.address {
  font-size: 13pt;
  margin-bottom: 24px;
  color: #495057;
  text-align: center;
}

/* Insights Section */
.insights {
  background: #e7f3ff;
  border-left: 4px solid #007bff;
  padding: 16px 20px;
  margin-bottom: 32px;
  page-break-inside: avoid;
}

.insights ul {
  margin-left: 20px;
  margin-top: 8px;
}

.insights li {
  margin-bottom: 6px;
}

/* Tables */
table {
  width: 100%;
  max-width: 600px;
  border-collapse: collapse;
  margin-bottom: 24px;
}

thead {
  display: table-header-group;
}

th {
  background: #4a90e2;
  color: white;
  font-weight: 600;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #ddd;
}

td {
  padding: 8px 12px;
  border: 1px solid #ddd;
}

tbody tr:nth-child(even) {
  background: #f8f9fa;
}

/* Chart Sections */
.chart {
  max-width: 690px;
  margin: 0 auto 18px auto;
  padding-right: 8px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.chart + .chart {
  margin-top: 18px;
}

.chart--wide {
  margin-bottom: 24px;
}

.chart-canvas {
  width: 100% !important;
  height: 220px !important;
  display: block;
}

.chart--wide .chart-canvas {
  height: 260px !important;
}

/* Chart Grid for Small Multiples */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin: 0 auto;
  max-width: 690px;
}

/* Daily Logs */
.daily-log {
  page-break-inside: avoid;
  margin-bottom: 32px;
}

.daily-log h3 {
  background: #f8f9fa;
  padding: 8px 12px;
  border-left: 4px solid #007bff;
  margin-bottom: 12px;
}

.daily-log table {
  max-width: 100%;
}

/* Disclaimer */
.disclaimer {
  font-size: 9pt;
  color: #6c757d;
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
  page-break-inside: avoid;
}

/* Print-specific adjustments */
@media print {
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  .chart,
  .daily-log,
  .insights {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;
