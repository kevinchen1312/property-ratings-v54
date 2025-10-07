/**
 * Chart.js Factory Module for PDF Reports
 * Single source of truth for all chart configurations
 * Chart.js v4.x with chartjs-adapter-date-fns
 */

// Color palette for Leadsong - distinct but muted tones
const COLORS = {
  quietness: {
    border: '#5B8C5A',      // Muted green
    background: 'rgba(91, 140, 90, 0.1)',
    point: '#5B8C5A'
  },
  cleanliness: {
    border: '#4A90E2',      // Muted blue
    background: 'rgba(74, 144, 226, 0.1)',
    point: '#4A90E2'
  },
  safety: {
    border: '#D97706',      // Muted orange
    background: 'rgba(217, 119, 6, 0.1)',
    point: '#D97706'
  }
};

/**
 * Global Chart.js defaults
 */
const GLOBAL_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 2,
  animation: false,
  spanGaps: true
};

/**
 * Create a line chart with standardized configuration
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} options - Chart options
 * @param {Array} options.datasets - Array of dataset configurations
 * @param {boolean} options.xIsTime - Whether x-axis is time-based
 * @param {string} options.xLabel - X-axis label
 * @param {string} options.yLabel - Y-axis label (default: 'Average Rating (1-5)')
 * @param {boolean} options.showLegend - Show legend (default: true)
 * @returns {Chart} Chart.js instance
 */
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
          right: 24,  // Extra right padding to prevent cutoff
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

/**
 * Create dataset configuration for a rating attribute
 * @param {string} attribute - 'quietness', 'cleanliness', or 'safety'
 * @param {Array} data - Array of {x, y} data points
 * @param {string} label - Dataset label
 * @returns {Object} Dataset configuration
 */
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
    tension: 0.25,  // Smooth curves
    fill: false,
    clip: false  // Don't clip points at edge
  };
}

/**
 * Render all charts for the report
 * @param {Object} data - Chart data organized by trend type
 * @returns {Promise<void>} Resolves when all charts are rendered
 */
async function renderAllCharts(data) {
  try {
    // Daily Rating Trends (multi-line chart)
    const dailyCanvas = document.getElementById('trend-daily');
    if (dailyCanvas && data.dailyTrends) {
      const ctx = dailyCanvas.getContext('2d');
      
      // Prepare datasets for all three attributes
      const datasets = [];
      
      if (data.dailyTrends.quietness && data.dailyTrends.quietness.length > 0) {
        datasets.push(createDataset(
          'quietness',
          data.dailyTrends.quietness.map(p => ({ x: p.date, y: p.avg })),
          'Quietness'
        ));
      }
      
      if (data.dailyTrends.cleanliness && data.dailyTrends.cleanliness.length > 0) {
        datasets.push(createDataset(
          'cleanliness',
          data.dailyTrends.cleanliness.map(p => ({ x: p.date, y: p.avg })),
          'Cleanliness'
        ));
      }
      
      if (data.dailyTrends.safety && data.dailyTrends.safety.length > 0) {
        datasets.push(createDataset(
          'safety',
          data.dailyTrends.safety.map(p => ({ x: p.date, y: p.avg })),
          'Safety'
        ));
      }
      
      // Calculate time padding for x-axis (prevent cutoff)
      let xMin = null, xMax = null;
      if (datasets.length > 0 && datasets[0].data.length > 0) {
        const allDates = datasets.flatMap(ds => ds.data.map(d => new Date(d.x)));
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Add 12 hour padding on each side
        xMin = new Date(minDate.getTime() - 12 * 60 * 60 * 1000);
        xMax = new Date(maxDate.getTime() + 12 * 60 * 60 * 1000);
      }
      
      createLineChart(ctx, {
        datasets,
        xIsTime: true,
        xLabel: 'Date',
        yLabel: 'Average Rating (1-5)',
        showLegend: true,
        xMin,
        xMax
      });
    }
    
    // Hourly Quietness Trend
    const hourlyQuietCanvas = document.getElementById('trend-hourly-quiet');
    if (hourlyQuietCanvas && data.hourlyTrends && data.hourlyTrends.quietness) {
      const ctx = hourlyQuietCanvas.getContext('2d');
      const dataset = createDataset(
        'quietness',
        data.hourlyTrends.quietness.map(p => ({ x: p.hour, y: p.avg })),
        'Quietness'
      );
      
      createLineChart(ctx, {
        datasets: [dataset],
        xIsTime: false,
        xLabel: 'Hour of Day',
        yLabel: 'Average Rating (1-5)',
        showLegend: false,
        xMin: 0,
        xMax: 23
      });
    }
    
    // Hourly Cleanliness Trend
    const hourlyCleanCanvas = document.getElementById('trend-hourly-clean');
    if (hourlyCleanCanvas && data.hourlyTrends && data.hourlyTrends.cleanliness) {
      const ctx = hourlyCleanCanvas.getContext('2d');
      const dataset = createDataset(
        'cleanliness',
        data.hourlyTrends.cleanliness.map(p => ({ x: p.hour, y: p.avg })),
        'Cleanliness'
      );
      
      createLineChart(ctx, {
        datasets: [dataset],
        xIsTime: false,
        xLabel: 'Hour of Day',
        yLabel: 'Average Rating (1-5)',
        showLegend: false,
        xMin: 0,
        xMax: 23
      });
    }
    
    // Hourly Safety Trend
    const hourlySafetyCanvas = document.getElementById('trend-hourly-safety');
    if (hourlySafetyCanvas && data.hourlyTrends && data.hourlyTrends.safety) {
      const ctx = hourlySafetyCanvas.getContext('2d');
      const dataset = createDataset(
        'safety',
        data.hourlyTrends.safety.map(p => ({ x: p.hour, y: p.avg })),
        'Safety'
      );
      
      createLineChart(ctx, {
        datasets: [dataset],
        xIsTime: false,
        xLabel: 'Hour of Day',
        yLabel: 'Average Rating (1-5)',
        showLegend: false,
        xMin: 0,
        xMax: 23
      });
    }
    
    // Signal that all charts are ready
    window.__chartsReady = true;
    
  } catch (error) {
    console.error('Chart rendering error:', error);
    window.__chartsReady = true;  // Signal ready even on error
  }
}

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createLineChart, createDataset, renderAllCharts, COLORS };
}
