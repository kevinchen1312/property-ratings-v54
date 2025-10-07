// Vercel Serverless Function for PDF Generation
// Uses @sparticuz/chromium (actively maintained, Vercel-compatible)
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// Vercel function configuration - more memory for PDF generation
export const config = {
  memory: 1024,
  maxDuration: 30,
};

// Helper function to map attributes
function mapAttribute(attr) {
  const mapping = {
    'noise': 'Quietness',
    'quietness': 'Quietness',
    'cleanliness': 'Cleanliness',
    'safety': 'Safety',
    'friendliness': 'Safety'
  };
  return mapping[attr?.toLowerCase()] || attr;
}

// Helper to format address properly
function formatAddress(address) {
  // Parse address: "1234, Main St, San Jose, CA 95129"
  // Should become: "1234 Main St, San Jose, CA 95129, USA"
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    // Remove comma between number and street
    const streetPart = `${parts[0]} ${parts[1]}`;
    const city = parts[2] || '';
    const stateZip = parts[3] || '';
    
    return `${streetPart}, ${city}, ${stateZip}, USA`;
  }
  
  return address + ', USA';
}

// Inline chart module code (for reliability in serverless environment)
const chartModuleCode = `
// Color palette for Leadsong - distinct but muted tones
const COLORS = {
  quietness: {
    border: '#5B8C5A',
    background: 'rgba(91, 140, 90, 0.1)',
    point: '#5B8C5A'
  },
  cleanliness: {
    border: '#0066CC',
    background: 'rgba(0, 102, 204, 0.1)',
    point: '#0066CC'
  },
  safety: {
    border: '#FF6B35',
    background: 'rgba(255, 107, 53, 0.1)',
    point: '#FF6B35'
  }
};

const GLOBAL_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 2,
  animation: false,
  spanGaps: true
};

function createLineChart(ctx, options) {
  const {
    datasets = [],
    xIsTime = false,
    xLabel = '',
    yLabel = 'Average Rating (1-5)',
    showLegend = true,
    xMin = null,
    xMax = null
  } = options;

  const config = {
    type: 'line',
    data: { datasets },
    options: {
      ...GLOBAL_DEFAULTS,
      layout: {
        padding: {
          left: 8,
          right: 24,
          top: 8,
          bottom: 8
        }
      },
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 6,
            padding: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          mode: 'nearest',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 8,
          cornerRadius: 4
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
            padding: 8,
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
            tickColor: 'transparent',
            drawBorder: false,
            lineWidth: 1
          },
          title: {
            display: !!yLabel,
            text: yLabel,
            font: { size: 11 },
            padding: { bottom: 8 }
          }
        },
        x: xIsTime ? {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'MMM d',
            displayFormats: {
              day: 'MMM d'
            }
          },
          adapters: {
            date: {
              locale: 'en-US'
            }
          },
          min: xMin,
          max: xMax,
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            maxRotation: 0,
            font: { size: 10 },
            padding: 4
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
            tickColor: 'transparent',
            drawBorder: false
          },
          title: {
            display: !!xLabel,
            text: xLabel,
            font: { size: 11 },
            padding: { top: 8 }
          }
        } : {
          type: 'linear',
          min: xMin !== null ? xMin : undefined,
          max: xMax !== null ? xMax : undefined,
          ticks: {
            stepSize: 1,
            maxRotation: 0,
            font: { size: 10 },
            padding: 4
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
            tickColor: 'transparent',
            drawBorder: false
          },
          title: {
            display: !!xLabel,
            text: xLabel,
            font: { size: 11 },
            padding: { top: 8 }
          }
        }
      }
    }
  };

  return new Chart(ctx, config);
}

function createDataset(attribute, data, label) {
  const colors = COLORS[attribute.toLowerCase()] || COLORS.quietness;
  
  return {
    label: label,
    data: data,
    borderColor: colors.border,
    backgroundColor: colors.background,
    pointBackgroundColor: colors.point,
    pointBorderColor: colors.point,
    pointRadius: 2,
    pointHoverRadius: 3,
    borderWidth: 2,
    tension: 0.25,
    fill: false,
    clip: false
  };
}

function formatHour(hour) {
  if (hour === 0) return '12:00am';
  if (hour < 12) return hour + ':00am';
  if (hour === 12) return '12:00pm';
  return (hour - 12) + ':00pm';
}

async function renderAllCharts(data) {
  try {
    if (typeof Chart === 'undefined') {
      window.__chartsReady = true;
      return;
    }
    
    // Helper function to create a single daily chart
    function createDailyChart(canvasId, attribute, colorScheme, label) {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !data.dailyTrends || !data.dailyTrends[attribute] || data.dailyTrends[attribute].length === 0) {
        return;
      }
      
      try {
        const ctx = canvas.getContext('2d');
        const chartData = data.dailyTrends[attribute];
        
        // Sort by date and create labels
        const sortedData = chartData.map(p => ({
          date: p.date,
          value: p.avg
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const labels = sortedData.map(p => {
          const date = new Date(p.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const values = sortedData.map(p => p.value);
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: label,
              data: values,
              borderColor: colorScheme.border,
              backgroundColor: colorScheme.background,
              pointBackgroundColor: colorScheme.point,
              pointBorderColor: colorScheme.border,
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2,
            animation: false,
            spanGaps: true,
            layout: {
              padding: { left: 4, right: 4, top: 8, bottom: 8 }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, padding: 8, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Rating (1-5)', font: { size: 11 }, padding: { bottom: 8 } }
              },
              x: {
                ticks: { maxRotation: 0, font: { size: 10 }, padding: 4 },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Date', font: { size: 11 }, padding: { top: 8 } }
              }
            }
          }
        });
      } catch (err) {
        console.error('Daily chart error for', label, ':', err.message);
      }
    }
    
    // Create 3 separate daily charts
    createDailyChart('trend-daily-quiet', 'quietness', COLORS.quietness, 'Quietness');
    createDailyChart('trend-daily-clean', 'cleanliness', COLORS.cleanliness, 'Cleanliness');
    createDailyChart('trend-daily-safe', 'safety', COLORS.safety, 'Safety');
    
    const hourlyQuietCanvas = document.getElementById('trend-hourly-quiet');
    if (hourlyQuietCanvas && data.hourlyTrends && data.hourlyTrends.quietness) {
      try {
        const ctx = hourlyQuietCanvas.getContext('2d');
        const hourData = data.hourlyTrends.quietness;
        const labels = hourData.map(p => formatHour(p.hour));
        const values = hourData.map(p => p.avg);
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [createDataset('quietness', values, 'Quietness')]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2,
            animation: false,
            spanGaps: true,
            layout: { padding: { left: 4, right: 4, top: 8, bottom: 8 } },
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'nearest', intersect: false }
            },
            scales: {
              y: {
                beginAtZero: false,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, padding: 8, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Average Rating (1-5)', font: { size: 11 }, padding: { bottom: 8 } }
              },
              x: {
                ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 }, padding: 4 },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Time of Day', font: { size: 11 }, padding: { top: 8 } }
              }
            }
          }
        });
      } catch (err) {
        console.error('Hourly quietness chart error:', err.message);
      }
    }
    
    const hourlyCleanCanvas = document.getElementById('trend-hourly-clean');
    if (hourlyCleanCanvas && data.hourlyTrends && data.hourlyTrends.cleanliness) {
      try {
        const ctx = hourlyCleanCanvas.getContext('2d');
        const hourData = data.hourlyTrends.cleanliness;
        const labels = hourData.map(p => formatHour(p.hour));
        const values = hourData.map(p => p.avg);
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [createDataset('cleanliness', values, 'Cleanliness')]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2,
            animation: false,
            spanGaps: true,
            layout: { padding: { left: 4, right: 4, top: 8, bottom: 8 } },
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'nearest', intersect: false }
            },
            scales: {
              y: {
                beginAtZero: false,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, padding: 8, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Average Rating (1-5)', font: { size: 11 }, padding: { bottom: 8 } }
              },
              x: {
                ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 }, padding: 4 },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Time of Day', font: { size: 11 }, padding: { top: 8 } }
              }
            }
          }
        });
      } catch (err) {
        console.error('Hourly cleanliness chart error:', err.message);
      }
    }
    
    const hourlySafetyCanvas = document.getElementById('trend-hourly-safety');
    if (hourlySafetyCanvas && data.hourlyTrends && data.hourlyTrends.safety) {
      try {
        const ctx = hourlySafetyCanvas.getContext('2d');
        const hourData = data.hourlyTrends.safety;
        const labels = hourData.map(p => formatHour(p.hour));
        const values = hourData.map(p => p.avg);
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [createDataset('safety', values, 'Safety')]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2,
            animation: false,
            spanGaps: true,
            layout: { padding: { left: 4, right: 4, top: 8, bottom: 8 } },
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'nearest', intersect: false }
            },
            scales: {
              y: {
                beginAtZero: false,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, padding: 8, font: { size: 11 } },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Average Rating (1-5)', font: { size: 11 }, padding: { bottom: 8 } }
              },
              x: {
                ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 }, padding: 4 },
                grid: { color: 'rgba(0, 0, 0, 0.08)', tickColor: 'transparent', drawBorder: false },
                title: { display: true, text: 'Time of Day', font: { size: 11 }, padding: { top: 8 } }
              }
            }
          }
        });
      } catch (err) {
        console.error('Hourly safety chart error:', err.message);
      }
    }
    
    window.__chartsReady = true;
  } catch (error) {
    console.error('Chart rendering error:', error);
    window.__chartsReady = true;
  }
}
`;

// Inline report CSS
const reportCSS = `
@page { size: letter; margin: 0.25in 0.25in 0.25in 0.25in; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #212529; padding: 8px 4px 12px; }
h1 { font-size: 24pt; font-weight: 700; margin-bottom: 8px; color: #000; text-align: center; }
h2 { font-size: 18pt; font-weight: 700; margin: 40px 0 20px 0; color: #000; text-align: left; }
h3 { font-size: 12pt; font-weight: 600; margin: 0 0 12px 0; color: #000; text-align: left; }
h4 { font-size: 11pt; font-weight: 600; margin: 0 0 8px 0; color: #333; text-align: left; }
.address { font-size: 13pt; margin-bottom: 24px; color: #495057; text-align: center; }
.insights { background: #e7f3ff; border-left: 4px solid #007bff; padding: 16px 20px; margin-bottom: 32px; page-break-inside: avoid; }
.insights ul { margin-left: 20px; margin-top: 8px; }
.insights li { margin-bottom: 6px; }
table { width: 100%; max-width: 600px; border-collapse: collapse; margin-bottom: 24px; }
thead { display: table-header-group; }
th { background: #4a90e2; color: white; font-weight: 600; padding: 10px 12px; text-align: left; border: 1px solid #ddd; }
td { padding: 8px 12px; border: 1px solid #ddd; }
tbody tr:nth-child(even) { background: #f8f9fa; }
.chart { max-width: 100%; width: 100%; margin: 0 0 18px 0; padding: 0; break-inside: avoid; page-break-inside: avoid; }
.chart + .chart { margin-top: 18px; }
.chart--wide { margin-bottom: 24px; }
.chart-canvas { width: 100% !important; height: 260px !important; display: block; }
.chart--wide .chart-canvas { height: 300px !important; }
.chart-grid { display: grid; grid-template-columns: 1fr; gap: 18px; margin: 0; max-width: 100%; width: 100%; }
.chart-grid .chart { max-width: 100%; width: 100%; margin: 0; padding: 0; }
.daily-log { page-break-inside: avoid; margin-bottom: 32px; }
.daily-log h3 { background: #f8f9fa; padding: 8px 12px; border-left: 4px solid #007bff; margin-bottom: 12px; }
.daily-log table { max-width: 100%; }
.disclaimer { font-size: 9pt; color: #6c757d; margin-top: 40px; padding-top: 16px; border-top: 1px solid #dee2e6; page-break-inside: avoid; }
.section-break { page-break-before: always; break-before: page; }
@media print {
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .chart, .daily-log, .insights { break-inside: avoid; page-break-inside: avoid; }
  .section-break { page-break-before: always; break-before: page; }
}
`;

// Generate HTML report
function generateHTMLReport(data) {
  const { property, insights, overallSummary, monthlySummary, dailyTrends, hourlyTrends, dailyLogs } = data;
  
  const fmtRating = (val) => val !== null ? `${val.toFixed(2)} / 5` : '-';
  const formattedAddress = formatAddress(property.address);
  
  // Prepare chart data in the exact format expected by charts.js
  const chartData = {
    dailyTrends: {
      quietness: dailyTrends.quietness || [],
      cleanliness: dailyTrends.cleanliness || [],
      safety: dailyTrends.safety || []
    },
    hourlyTrends: {
      quietness: hourlyTrends.quietness || [],
      cleanliness: hourlyTrends.cleanliness || [],
      safety: hourlyTrends.safety || []
    }
  };
  
  const chartDataJSON = JSON.stringify(chartData);
  
  console.log('🎨 NEW CHARTING SYSTEM ACTIVE - Multi-line daily chart with canvas IDs: trend-daily, trend-hourly-quiet, trend-hourly-clean, trend-hourly-safety');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${reportCSS}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
</head>
<body>
  <h1>Community Observation Report</h1>
  <div class="address">${formattedAddress}</div>
  
  <h2>Overall Rating Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Attribute</th>
        <th>Avg. Rating</th>
        <th>Total Ratings</th>
      </tr>
    </thead>
    <tbody>
      ${overallSummary.map(row => `
        <tr>
          <td>${row.attribute}</td>
          <td>${fmtRating(row.avg)}</td>
          <td>${row.count}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Monthly Rating Summary</h2>
  ${monthlySummary.map(month => `
    <h3>${month.label} Ratings</h3>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          <th>Avg. Rating</th>
          <th>Total Ratings</th>
        </tr>
      </thead>
      <tbody>
        ${month.rows.map(row => `
          <tr>
            <td>${row.attribute}</td>
            <td>${row.avg !== null ? fmtRating(row.avg) : '-'}</td>
            <td>${row.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
  
  <h2 class="section-break">Daily Rating Trends</h2>
  
  <div class="chart-grid">
    <div class="chart">
      <h4>Quietness Over Time</h4>
      <canvas id="trend-daily-quiet" class="chart-canvas"></canvas>
  </div>
  
    <div class="chart">
      <h4>Cleanliness Over Time</h4>
      <canvas id="trend-daily-clean" class="chart-canvas"></canvas>
  </div>
  
    <div class="chart">
      <h4>Safety Over Time</h4>
      <canvas id="trend-daily-safe" class="chart-canvas"></canvas>
    </div>
  </div>
  
  <h2 class="section-break">Time-of-Day Rating Trends</h2>
  
  <div class="chart-grid">
    <div class="chart">
      <h4>Quietness by Hour of Day</h4>
      <canvas id="trend-hourly-quiet" class="chart-canvas"></canvas>
  </div>
  
    <div class="chart">
      <h4>Cleanliness by Hour of Day</h4>
      <canvas id="trend-hourly-clean" class="chart-canvas"></canvas>
  </div>
  
    <div class="chart">
      <h4>Safety by Hour of Day</h4>
      <canvas id="trend-hourly-safety" class="chart-canvas"></canvas>
    </div>
  </div>
  
  <div class="insights section-break">
    <h2 style="margin-top: 0;">Key Insights</h2>
    <ul>
      ${insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>
  </div>
  
  <h2 class="section-break">Daily Logs</h2>
  ${dailyLogs.map(log => {
    const dateObj = new Date(log.date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const grouped = {};
    log.rows.forEach(r => {
      const time = new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const userId = r.user_hash || (r.user_id ? r.user_id.toString().substring(0, 8) : 'User');
      const key = `${time}-${userId}`;
      if (!grouped[key]) {
        grouped[key] = { time, user: userId, quietness: '', cleanliness: '', safety: '' };
      }
      const attr = mapAttribute(r.attribute);
      if (attr === 'Quietness') grouped[key].quietness = `${r.stars}/5`;
      if (attr === 'Cleanliness') grouped[key].cleanliness = `${r.stars}/5`;
      if (attr === 'Safety') grouped[key].safety = `${r.stars}/5`;
    });
    
    const rows = Object.values(grouped);
    
    return `
      <div class="daily-log">
        <h3>${dayName}, ${monthDay}</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Quietness</th>
              <th>Cleanliness</th>
              <th>Safety</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.time}</td>
                <td>${row.user}</td>
                <td>${row.quietness}</td>
                <td>${row.cleanliness}</td>
                <td>${row.safety}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('')}
  
  <div class="disclaimer">
    <p><strong>Disclaimer:</strong> This report is generated from community observations and ratings. The data reflects subjective opinions of individual community members and may not represent objective measurements. Ratings are anonymized and aggregated for privacy. This report is provided for informational purposes only.</p>
  </div>
  
  <script>
    // Chart module code
    ${chartModuleCode}
    
    // Chart data from server
    const chartData = ${chartDataJSON};
    
    // Render all charts when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => renderAllCharts(chartData));
    } else {
      renderAllCharts(chartData);
    }
  </script>
</body>
</html>
  `;
}

// Main handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const reportData = req.body;
    
    // Validate required data
    if (!reportData || !reportData.property) {
      return res.status(400).json({ error: 'Missing report data' });
    }
    
    console.log('Generating PDF for property:', reportData.property.address);
    
    // Generate HTML
    const htmlContent = generateHTMLReport(reportData);
    
    // Launch Puppeteer with @sparticuz/chromium (Vercel-compatible)
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-gpu', '--single-process'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page (must be before setContent)
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    
    // Set viewport to Letter size at 2x scale for crisp rendering
    await page.setViewport({ 
      width: Math.round(8.5 * 96), 
      height: Math.round(11 * 96), 
      deviceScaleFactor: 2 
    });
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for Chart.js to load
    await page.waitForFunction('typeof Chart !== "undefined"', { timeout: 10000 })
      .catch(() => console.error('Chart.js failed to load from CDN!'));
    
    // Wait for all charts to be ready
    await page.waitForFunction('window.__chartsReady === true', { 
      timeout: 15000 
    }).catch(() => {
      console.log('Charts ready signal not received, continuing anyway');
    });
    
    // Extra delay for final rendering
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Generating PDF...');
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });
    
    await browser.close();
    
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Convert PDF buffer to base64 string
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    console.log('Base64 PDF length:', base64Pdf.length);
    console.log('Base64 PDF preview:', base64Pdf.substring(0, 50));
    
    // Return PDF as base64 for easy transport to Supabase
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      pdf: base64Pdf,
      size: pdfBuffer.length
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'PDF generation failed',
      message: error.message 
    });
  }
}
