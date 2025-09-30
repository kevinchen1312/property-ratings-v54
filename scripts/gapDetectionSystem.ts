#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GAP DETECTION AND COVERAGE ANALYSIS SYSTEM
// This system identifies areas with insufficient property coverage
// and generates targeted import tasks to fill gaps

interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface CoverageCell {
  id: string;
  bounds: GeographicBounds;
  state: string;
  county?: string;
  city?: string;
  propertyCount: number;
  expectedProperties: number;
  coverageRatio: number;
  populationDensity: number;
  isGap: boolean;
  priority: number;
}

interface GapAnalysisResult {
  totalCells: number;
  gapCells: number;
  gapPercentage: number;
  totalMissingProperties: number;
  gapsByState: Record<string, number>;
  gapsByPriority: Record<number, number>;
  recommendedActions: string[];
}

interface PropertyDensityStats {
  state: string;
  county?: string;
  totalProperties: number;
  area: number; // square degrees
  density: number; // properties per square degree
  expectedDensity: number;
  isUnderserved: boolean;
}

// US POPULATION DENSITY DATA (properties per square mile estimates)
const US_DENSITY_ESTIMATES: Record<string, { urban: number, suburban: number, rural: number }> = {
  'CA': { urban: 8000, suburban: 2500, rural: 50 },
  'NY': { urban: 12000, suburban: 3000, rural: 80 },
  'TX': { urban: 6000, suburban: 2000, rural: 30 },
  'FL': { urban: 7000, suburban: 2200, rural: 40 },
  'IL': { urban: 9000, suburban: 2800, rural: 60 },
  'PA': { urban: 8500, suburban: 2600, rural: 70 },
  'OH': { urban: 7500, suburban: 2400, rural: 65 },
  'MI': { urban: 7000, suburban: 2300, rural: 55 },
  'GA': { urban: 6500, suburban: 2100, rural: 45 },
  'NC': { urban: 6000, suburban: 2000, rural: 40 },
  'NJ': { urban: 10000, suburban: 3500, rural: 100 },
  'VA': { urban: 6500, suburban: 2200, rural: 50 },
  'WA': { urban: 7500, suburban: 2400, rural: 35 },
  'AZ': { urban: 5500, suburban: 1800, rural: 25 },
  'MA': { urban: 9500, suburban: 3200, rural: 90 },
  'TN': { urban: 5500, suburban: 1900, rural: 35 },
  'IN': { urban: 6500, suburban: 2100, rural: 50 },
  'MO': { urban: 6000, suburban: 2000, rural: 40 },
  'MD': { urban: 8000, suburban: 2800, rural: 80 },
  'WI': { urban: 6500, suburban: 2200, rural: 45 },
  'CO': { urban: 6000, suburban: 2000, rural: 20 },
  'MN': { urban: 6500, suburban: 2200, rural: 40 },
  'SC': { urban: 5500, suburban: 1800, rural: 35 },
  'AL': { urban: 5000, suburban: 1700, rural: 30 },
  'LA': { urban: 5500, suburban: 1800, rural: 25 },
  'KY': { urban: 5000, suburban: 1700, rural: 35 },
  'OR': { urban: 6500, suburban: 2100, rural: 25 },
  'OK': { urban: 4500, suburban: 1600, rural: 20 },
  'CT': { urban: 9000, suburban: 3000, rural: 100 },
  'UT': { urban: 5500, suburban: 1900, rural: 15 },
  'IA': { urban: 5000, suburban: 1800, rural: 30 },
  'NV': { urban: 4500, suburban: 1500, rural: 10 },
  'AR': { urban: 4000, suburban: 1400, rural: 25 },
  'MS': { urban: 4000, suburban: 1400, rural: 25 },
  'KS': { urban: 4500, suburban: 1600, rural: 20 },
  'NM': { urban: 4000, suburban: 1300, rural: 15 },
  'NE': { urban: 4500, suburban: 1600, rural: 20 },
  'WV': { urban: 4500, suburban: 1600, rural: 30 },
  'ID': { urban: 4000, suburban: 1400, rural: 15 },
  'HI': { urban: 8000, suburban: 2500, rural: 50 },
  'NH': { urban: 6000, suburban: 2200, rural: 60 },
  'ME': { urban: 5500, suburban: 2000, rural: 40 },
  'RI': { urban: 8500, suburban: 2800, rural: 80 },
  'MT': { urban: 3500, suburban: 1200, rural: 8 },
  'DE': { urban: 7000, suburban: 2400, rural: 60 },
  'SD': { urban: 3500, suburban: 1200, rural: 10 },
  'ND': { urban: 3500, suburban: 1200, rural: 8 },
  'AK': { urban: 3000, suburban: 1000, rural: 5 },
  'VT': { urban: 5000, suburban: 1800, rural: 35 },
  'WY': { urban: 3000, suburban: 1000, rural: 5 },
  'DC': { urban: 15000, suburban: 5000, rural: 200 },
};

// Generate comprehensive grid for gap analysis
function generateAnalysisGrid(bounds: GeographicBounds, cellSize: number = 0.05): CoverageCell[] {
  const cells: CoverageCell[] = [];
  let cellId = 1;
  
  const latCells = Math.ceil((bounds.north - bounds.south) / cellSize);
  const lngCells = Math.ceil((bounds.east - bounds.west) / cellSize);
  
  for (let latIndex = 0; latIndex < latCells; latIndex++) {
    for (let lngIndex = 0; lngIndex < lngCells; lngIndex++) {
      const south = bounds.south + (latIndex * cellSize);
      const north = Math.min(bounds.north, south + cellSize);
      const west = bounds.west + (lngIndex * cellSize);
      const east = Math.min(bounds.east, west + cellSize);
      
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      const state = getStateFromCoordinates(centerLat, centerLng);
      
      cells.push({
        id: `CELL_${cellId.toString().padStart(6, '0')}`,
        bounds: { north, south, east, west },
        state,
        propertyCount: 0, // Will be populated by analysis
        expectedProperties: 0, // Will be calculated
        coverageRatio: 0,
        populationDensity: 0,
        isGap: false,
        priority: 3
      });
      
      cellId++;
    }
  }
  
  return cells;
}

// Analyze property coverage for a specific area
async function analyzeCoverage(bounds: GeographicBounds, cellSize: number = 0.05): Promise<GapAnalysisResult> {
  console.log('🔍 Starting comprehensive coverage analysis...');
  console.log(`📊 Analysis area: ${bounds.north.toFixed(4)}, ${bounds.south.toFixed(4)}, ${bounds.east.toFixed(4)}, ${bounds.west.toFixed(4)}`);
  console.log(`🔬 Cell size: ${cellSize} degrees`);
  
  // Generate analysis grid
  const cells = generateAnalysisGrid(bounds, cellSize);
  console.log(`📋 Generated ${cells.length.toLocaleString()} analysis cells`);
  
  // Analyze each cell
  const analyzedCells: CoverageCell[] = [];
  let processedCells = 0;
  
  for (const cell of cells) {
    try {
      const analyzedCell = await analyzeCoverageCell(cell);
      analyzedCells.push(analyzedCell);
      processedCells++;
      
      if (processedCells % 100 === 0) {
        console.log(`📊 Analyzed ${processedCells}/${cells.length} cells (${Math.round(processedCells / cells.length * 100)}%)`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
      
    } catch (error) {
      console.error(`❌ Failed to analyze cell ${cell.id}:`, error);
      // Continue with other cells
    }
  }
  
  // Generate analysis results
  const result = generateAnalysisResults(analyzedCells);
  
  // Save detailed results
  await saveAnalysisResults(result, analyzedCells);
  
  return result;
}

async function analyzeCoverageCell(cell: CoverageCell): Promise<CoverageCell> {
  // Count existing properties in this cell
  const { count, error } = await supabase
    .from('property')
    .select('*', { count: 'exact', head: true })
    .gte('lat', cell.bounds.south)
    .lte('lat', cell.bounds.north)
    .gte('lng', cell.bounds.west)
    .lte('lng', cell.bounds.east);
  
  if (error) {
    console.error(`Error counting properties for cell ${cell.id}:`, error);
    return cell;
  }
  
  cell.propertyCount = count || 0;
  
  // Calculate expected properties based on area type and density
  const areaType = determineAreaType(cell);
  const densityEstimate = getDensityEstimate(cell.state, areaType);
  const cellArea = calculateCellArea(cell.bounds);
  
  cell.expectedProperties = Math.round(densityEstimate * cellArea);
  cell.populationDensity = densityEstimate;
  cell.coverageRatio = cell.expectedProperties > 0 ? cell.propertyCount / cell.expectedProperties : 1;
  
  // Determine if this is a gap (less than 50% expected coverage)
  cell.isGap = cell.coverageRatio < 0.5 && cell.expectedProperties > 10;
  
  // Set priority based on gap severity and expected density
  if (cell.isGap) {
    if (cell.coverageRatio < 0.1 && cell.expectedProperties > 100) {
      cell.priority = 1; // Critical gap
    } else if (cell.coverageRatio < 0.3 && cell.expectedProperties > 50) {
      cell.priority = 2; // High priority gap
    } else {
      cell.priority = 3; // Medium priority gap
    }
  } else {
    cell.priority = 5; // No gap
  }
  
  return cell;
}

function determineAreaType(cell: CoverageCell): 'urban' | 'suburban' | 'rural' {
  // This is a simplified approach - in production, you'd use more sophisticated data
  const centerLat = (cell.bounds.north + cell.bounds.south) / 2;
  const centerLng = (cell.bounds.east + cell.bounds.west) / 2;
  
  // Major urban centers (simplified list)
  const urbanCenters = [
    { lat: 40.7128, lng: -74.0060, radius: 0.5 }, // NYC
    { lat: 34.0522, lng: -118.2437, radius: 0.8 }, // LA
    { lat: 41.8781, lng: -87.6298, radius: 0.5 }, // Chicago
    { lat: 29.7604, lng: -95.3698, radius: 0.6 }, // Houston
    { lat: 33.4484, lng: -112.0740, radius: 0.5 }, // Phoenix
    { lat: 39.9526, lng: -75.1652, radius: 0.4 }, // Philadelphia
    { lat: 32.7767, lng: -96.7970, radius: 0.5 }, // Dallas
    { lat: 37.7749, lng: -122.4194, radius: 0.3 }, // San Francisco
    { lat: 37.3382, lng: -121.8863, radius: 0.4 }, // San Jose
    { lat: 30.2672, lng: -97.7431, radius: 0.4 }, // Austin
  ];
  
  // Check if near urban center
  for (const center of urbanCenters) {
    const distance = Math.sqrt(
      Math.pow(centerLat - center.lat, 2) + Math.pow(centerLng - center.lng, 2)
    );
    if (distance < center.radius) {
      return 'urban';
    }
  }
  
  // Check if in suburban area (near urban but not in center)
  for (const center of urbanCenters) {
    const distance = Math.sqrt(
      Math.pow(centerLat - center.lat, 2) + Math.pow(centerLng - center.lng, 2)
    );
    if (distance < center.radius * 2) {
      return 'suburban';
    }
  }
  
  return 'rural';
}

function getDensityEstimate(state: string, areaType: 'urban' | 'suburban' | 'rural'): number {
  const stateEstimates = US_DENSITY_ESTIMATES[state] || US_DENSITY_ESTIMATES['TX']; // Default to Texas
  return stateEstimates[areaType];
}

function calculateCellArea(bounds: GeographicBounds): number {
  // Approximate area in square degrees (simplified calculation)
  const latDiff = bounds.north - bounds.south;
  const lngDiff = bounds.east - bounds.west;
  
  // Convert to approximate square miles (very rough approximation)
  const avgLat = (bounds.north + bounds.south) / 2;
  const latMilesPerDegree = 69; // Approximately 69 miles per degree latitude
  const lngMilesPerDegree = 69 * Math.cos(avgLat * Math.PI / 180); // Adjust for longitude
  
  const areaMiles = (latDiff * latMilesPerDegree) * (lngDiff * lngMilesPerDegree);
  return areaMiles;
}

function getStateFromCoordinates(lat: number, lng: number): string {
  // Simplified state detection - in production, use proper geographic data
  if (lat >= 32.5 && lat <= 42.0 && lng >= -124.4 && lng <= -114.1) return 'CA';
  if (lat >= 40.5 && lat <= 45.0 && lng >= -79.8 && lng <= -71.8) return 'NY';
  if (lat >= 25.8 && lat <= 36.5 && lng >= -106.6 && lng <= -93.5) return 'TX';
  if (lat >= 24.4 && lat <= 31.0 && lng >= -87.6 && lng <= -80.0) return 'FL';
  if (lat >= 37.0 && lat <= 42.5 && lng >= -91.5 && lng <= -87.0) return 'IL';
  if (lat >= 39.7 && lat <= 42.3 && lng >= -80.5 && lng <= -74.7) return 'PA';
  
  // Default fallback
  return 'US';
}

function generateAnalysisResults(cells: CoverageCell[]): GapAnalysisResult {
  const gapCells = cells.filter(cell => cell.isGap);
  const totalMissingProperties = gapCells.reduce((sum, cell) => 
    sum + Math.max(0, cell.expectedProperties - cell.propertyCount), 0
  );
  
  // Group gaps by state
  const gapsByState: Record<string, number> = {};
  gapCells.forEach(cell => {
    gapsByState[cell.state] = (gapsByState[cell.state] || 0) + 1;
  });
  
  // Group gaps by priority
  const gapsByPriority: Record<number, number> = {};
  gapCells.forEach(cell => {
    gapsByPriority[cell.priority] = (gapsByPriority[cell.priority] || 0) + 1;
  });
  
  // Generate recommendations
  const recommendedActions: string[] = [];
  
  if (gapsByPriority[1] > 0) {
    recommendedActions.push(`🚨 CRITICAL: ${gapsByPriority[1]} cells with severe gaps need immediate attention`);
  }
  
  if (gapsByPriority[2] > 0) {
    recommendedActions.push(`⚠️ HIGH PRIORITY: ${gapsByPriority[2]} cells with significant gaps`);
  }
  
  if (totalMissingProperties > 100000) {
    recommendedActions.push(`📊 SCALE: ${totalMissingProperties.toLocaleString()} missing properties detected`);
  }
  
  const topGapStates = Object.entries(gapsByState)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (topGapStates.length > 0) {
    recommendedActions.push(`🗺️ TOP GAP STATES: ${topGapStates.map(([state, count]) => `${state}(${count})`).join(', ')}`);
  }
  
  return {
    totalCells: cells.length,
    gapCells: gapCells.length,
    gapPercentage: (gapCells.length / cells.length) * 100,
    totalMissingProperties,
    gapsByState,
    gapsByPriority,
    recommendedActions
  };
}

async function saveAnalysisResults(result: GapAnalysisResult, cells: CoverageCell[]): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Save summary report
  const summaryFile = path.join(__dirname, `gap_analysis_summary_${timestamp}.json`);
  await fs.promises.writeFile(summaryFile, JSON.stringify(result, null, 2));
  
  // Save detailed cell data
  const detailsFile = path.join(__dirname, `gap_analysis_details_${timestamp}.json`);
  await fs.promises.writeFile(detailsFile, JSON.stringify(cells, null, 2));
  
  // Save gap cells only (for import planning)
  const gapCells = cells.filter(cell => cell.isGap);
  const gapFile = path.join(__dirname, `gap_cells_${timestamp}.json`);
  await fs.promises.writeFile(gapFile, JSON.stringify(gapCells, null, 2));
  
  console.log(`📄 Analysis results saved:`);
  console.log(`  Summary: ${summaryFile}`);
  console.log(`  Details: ${detailsFile}`);
  console.log(`  Gap cells: ${gapFile}`);
}

// Generate targeted import tasks for gap cells
async function generateGapFillTasks(gapCells: CoverageCell[]): Promise<void> {
  console.log('📋 Generating gap fill import tasks...');
  
  // Sort by priority (highest first)
  const sortedGaps = gapCells.sort((a, b) => a.priority - b.priority);
  
  const tasks = sortedGaps.map((cell, index) => ({
    taskId: `GAP_FILL_${(index + 1).toString().padStart(4, '0')}`,
    priority: cell.priority,
    state: cell.state,
    bounds: cell.bounds,
    currentProperties: cell.propertyCount,
    expectedProperties: cell.expectedProperties,
    missingProperties: Math.max(0, cell.expectedProperties - cell.propertyCount),
    coverageRatio: cell.coverageRatio,
    estimatedTime: Math.ceil(cell.expectedProperties / 1000) * 2, // 2 minutes per 1000 properties
    overpassQuery: generateOverpassQuery(cell.bounds)
  }));
  
  // Save task list
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const taskFile = path.join(__dirname, `gap_fill_tasks_${timestamp}.json`);
  await fs.promises.writeFile(taskFile, JSON.stringify(tasks, null, 2));
  
  console.log(`📋 Generated ${tasks.length} gap fill tasks`);
  console.log(`📄 Tasks saved to: ${taskFile}`);
  
  // Generate execution script
  const scriptContent = generateGapFillScript(tasks);
  const scriptFile = path.join(__dirname, `executeGapFill_${timestamp}.ts`);
  await fs.promises.writeFile(scriptFile, scriptContent);
  
  console.log(`🔧 Execution script generated: ${scriptFile}`);
}

function generateOverpassQuery(bounds: GeographicBounds): string {
  return `
[out:json][timeout:30];
(
  // Buildings with addresses
  way["building"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  
  // Residential buildings (for gap filling)
  way["building"="residential"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="house"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="apartments"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="detached"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="semi_detached"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="terrace"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"="townhouse"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"="residential"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"="house"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out body;
>; out skel qt;
`.trim();
}

function generateGapFillScript(tasks: any[]): string {
  return `#!/usr/bin/env ts-node

// AUTO-GENERATED GAP FILL EXECUTION SCRIPT
// This script executes targeted imports for identified coverage gaps

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TASKS = ${JSON.stringify(tasks, null, 2)};

async function executeGapFillTasks() {
  console.log('🔧 Starting gap fill execution...');
  console.log(\`📋 Total tasks: \${TASKS.length}\`);
  
  let completed = 0;
  let totalInserted = 0;
  
  for (const task of TASKS) {
    console.log(\`\\n📍 [\${completed + 1}/\${TASKS.length}] \${task.taskId}\`);
    console.log(\`  State: \${task.state} | Priority: \${task.priority}\`);
    console.log(\`  Missing: \${task.missingProperties} properties\`);
    console.log(\`  Coverage: \${(task.coverageRatio * 100).toFixed(1)}%\`);
    
    try {
      // Execute OSM import for this task
      const result = await importTaskArea(task);
      totalInserted += result.inserted;
      completed++;
      
      console.log(\`✅ \${task.taskId}: +\${result.inserted} properties\`);
      
      // Delay between tasks
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(\`❌ Failed to execute \${task.taskId}:\`, error);
    }
  }
  
  console.log(\`\\n🎉 Gap fill execution complete!\`);
  console.log(\`✅ Completed: \${completed}/\${TASKS.length} tasks\`);
  console.log(\`📊 Total properties added: \${totalInserted.toLocaleString()}\`);
}

async function importTaskArea(task: any) {
  // Implementation would go here - similar to existing import functions
  // This is a placeholder for the actual import logic
  return { inserted: 0 };
}

if (require.main === module) {
  executeGapFillTasks();
}
`;
}

// Analyze specific state coverage
async function analyzeStateCoverage(state: string): Promise<PropertyDensityStats[]> {
  console.log(`🔍 Analyzing coverage for ${state}...`);
  
  // Get state boundaries (simplified)
  const stateBounds = getStateBounds(state);
  if (!stateBounds) {
    throw new Error(`Unknown state: ${state}`);
  }
  
  // Count total properties in state
  const { count: totalProperties, error } = await supabase
    .from('property')
    .select('*', { count: 'exact', head: true })
    .ilike('address', `%${state}%`);
  
  if (error) {
    throw new Error(`Failed to count properties: ${error.message}`);
  }
  
  const area = calculateCellArea(stateBounds);
  const density = (totalProperties || 0) / area;
  const expectedDensity = getDensityEstimate(state, 'suburban'); // Use suburban as average
  
  return [{
    state,
    totalProperties: totalProperties || 0,
    area,
    density,
    expectedDensity,
    isUnderserved: density < expectedDensity * 0.5
  }];
}

function getStateBounds(state: string): GeographicBounds | null {
  const stateBounds: Record<string, GeographicBounds> = {
    'CA': { north: 42.0, south: 32.5, east: -114.1, west: -124.4 },
    'NY': { north: 45.0, south: 40.5, east: -71.8, west: -79.8 },
    'TX': { north: 36.5, south: 25.8, east: -93.5, west: -106.6 },
    'FL': { north: 31.0, south: 24.4, east: -80.0, west: -87.6 },
    'IL': { north: 42.5, south: 37.0, east: -87.0, west: -91.5 },
    'PA': { north: 42.3, south: 39.7, east: -74.7, west: -80.5 },
    // Add more states as needed
  };
  
  return stateBounds[state] || null;
}

// Main execution function
async function main() {
  try {
    console.log('🔍 GAP DETECTION AND COVERAGE ANALYSIS SYSTEM');
    console.log('==============================================');
    console.log('🎯 MISSION: Identify and fill coverage gaps in property data');
    console.log('📊 Method: Systematic grid analysis with density comparison');
    console.log('🚀 Goal: Achieve complete coverage with zero gaps\n');
    
    // Example: Analyze California coverage
    const californiaBounds: GeographicBounds = {
      north: 42.0,
      south: 32.5,
      east: -114.1,
      west: -124.4
    };
    
    console.log('🔍 Starting California coverage analysis...');
    const analysisResult = await analyzeCoverage(californiaBounds, 0.1); // 0.1 degree cells
    
    console.log('\n📊 COVERAGE ANALYSIS RESULTS:');
    console.log('==============================');
    console.log(`📋 Total cells analyzed: ${analysisResult.totalCells.toLocaleString()}`);
    console.log(`❌ Gap cells found: ${analysisResult.gapCells.toLocaleString()}`);
    console.log(`📈 Gap percentage: ${analysisResult.gapPercentage.toFixed(2)}%`);
    console.log(`🏠 Missing properties: ${analysisResult.totalMissingProperties.toLocaleString()}`);
    
    console.log('\n🗺️ GAPS BY STATE:');
    Object.entries(analysisResult.gapsByState)
      .sort(([,a], [,b]) => b - a)
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count} gap cells`);
      });
    
    console.log('\n⚡ GAPS BY PRIORITY:');
    Object.entries(analysisResult.gapsByPriority)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([priority, count]) => {
        const priorityName = priority === '1' ? 'CRITICAL' : 
                            priority === '2' ? 'HIGH' : 
                            priority === '3' ? 'MEDIUM' : 'LOW';
        console.log(`  Priority ${priority} (${priorityName}): ${count} cells`);
      });
    
    console.log('\n💡 RECOMMENDATIONS:');
    analysisResult.recommendedActions.forEach(action => {
      console.log(`  ${action}`);
    });
    
    // Generate gap fill tasks if significant gaps found
    if (analysisResult.gapCells > 0) {
      console.log('\n🔧 Generating gap fill tasks...');
      // Load gap cells from saved file (in real implementation)
      // await generateGapFillTasks(gapCells);
    }
    
    console.log('\n🎉 Gap detection analysis complete!');
    console.log('📄 Detailed results saved to analysis files');
    console.log('🚀 Ready for targeted gap filling operations');
    
  } catch (error) {
    console.error('\n❌ Gap detection failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
if (require.main === module) {
  main();
}

export { 
  main, 
  analyzeCoverage, 
  analyzeStateCoverage, 
  generateGapFillTasks,
  GapAnalysisResult,
  CoverageCell 
};
