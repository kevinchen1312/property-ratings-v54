// Node.js script to analyze proximity validation between user location and property addresses
const fs = require('fs');

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula to calculate distance between two points in meters
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

function geocodeAddress(address) {
  // Simple geocoding simulation - in real implementation, you'd use Google Maps API or similar
  // For now, we'll use approximate coordinates for the known addresses
  const knownAddresses = {
    '1312 centennial court': { lat: 37.300100, lng: -122.008600 },
    '1306 centennial court': { lat: 37.300050, lng: -122.008650 },
    '1310 centennial court': { lat: 37.300075, lng: -122.008625 },
    '1318 centennial court': { lat: 37.300125, lng: -122.008575 },
    '1680 larkin avenue': { lat: 37.299500, lng: -122.009800 }
  };
  
  // Normalize address for lookup
  const normalized = address.toLowerCase()
    .replace(/,.*$/, '') // Remove everything after first comma
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try to find a match
  for (const [key, coords] of Object.entries(knownAddresses)) {
    if (normalized.includes(key) || key.includes(normalized.split(' ').slice(0, 3).join(' '))) {
      return coords;
    }
  }
  
  return null; // Address not found
}

function analyzeProximityValidation() {
  const csvPath = 'C:\\Users\\ucric\\Downloads\\Property_Survey_-_all_versions_-_labels_-_2025-09-26-01-58-44.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found at:', csvPath);
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.log('❌ CSV file appears to be empty or invalid');
    return;
  }
  
  // Parse header
  const headers = parseCsvLine(lines[0]);
  
  console.log('🎯 PROXIMITY VALIDATION ANALYSIS');
  console.log('=' .repeat(50));
  
  // Key column indices
  const addressCol = headers.indexOf('What is the address of the property you are rating?');
  const userLatCol = headers.indexOf('_Please verify your proximity to the property you are rating_latitude');
  const userLngCol = headers.indexOf('_Please verify your proximity to the property you are rating_longitude');
  const precisionCol = headers.indexOf('_Please verify your proximity to the property you are rating_precision');
  const timeCol = headers.indexOf('_submission_time');
  const nameCol = headers.indexOf('What is your name?');
  
  console.log(`📍 Analyzing ${lines.length - 1} survey responses for proximity validation...\n`);
  
  const validationResults = [];
  let totalValidEntries = 0;
  let withinRange = 0;
  let outsideRange = 0;
  
  // Process each survey response
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    
    if (fields.length < headers.length) continue;
    
    const address = fields[addressCol]?.replace(/"/g, '') || '';
    const userLat = parseFloat(fields[userLatCol]?.replace(/"/g, '') || '0');
    const userLng = parseFloat(fields[userLngCol]?.replace(/"/g, '') || '0');
    const precision = parseFloat(fields[precisionCol]?.replace(/"/g, '') || '0');
    const timestamp = fields[timeCol]?.replace(/"/g, '') || '';
    const surveyor = fields[nameCol]?.replace(/"/g, '') || '';
    
    if (!address || !userLat || !userLng) {
      console.log(`⚠️  Skipping entry ${i}: Missing address or coordinates`);
      continue;
    }
    
    // Get expected coordinates for the address
    const expectedCoords = geocodeAddress(address);
    
    if (!expectedCoords) {
      console.log(`⚠️  Could not geocode address: ${address}`);
      continue;
    }
    
    // Calculate distance between user location and expected property location
    const distance = calculateDistance(userLat, userLng, expectedCoords.lat, expectedCoords.lng);
    
    const result = {
      entryNumber: i,
      address: address,
      surveyor: surveyor,
      timestamp: timestamp,
      userLocation: { lat: userLat, lng: userLng },
      expectedLocation: expectedCoords,
      distance: distance,
      precision: precision,
      isValid: distance <= 100, // Your app uses 100m validation
      isWithinAppRange: distance <= 2000 // Your app allows rating within 2000m
    };
    
    validationResults.push(result);
    totalValidEntries++;
    
    if (result.isValid) {
      withinRange++;
    } else {
      outsideRange++;
    }
    
    // Display individual result
    const statusIcon = result.isValid ? '✅' : (result.isWithinAppRange ? '⚠️' : '❌');
    const distanceStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(2)}km`;
    
    console.log(`${statusIcon} Entry ${i}: ${distanceStr} from property`);
    console.log(`   📍 ${address}`);
    console.log(`   👤 ${surveyor} at ${timestamp}`);
    console.log(`   🎯 User: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
    console.log(`   🏠 Expected: ${expectedCoords.lat.toFixed(6)}, ${expectedCoords.lng.toFixed(6)}`);
    console.log(`   📏 GPS Precision: ±${precision}m`);
    
    if (!result.isValid) {
      if (result.isWithinAppRange) {
        console.log(`   ⚠️  Outside 100m validation but within 2000m app range`);
      } else {
        console.log(`   ❌ Outside both validation (100m) and app range (2000m)`);
      }
    }
    console.log('');
  }
  
  // Summary statistics
  console.log('\n📊 PROXIMITY VALIDATION SUMMARY');
  console.log('=' .repeat(50));
  console.log(`📋 Total Valid Entries: ${totalValidEntries}`);
  console.log(`✅ Within 100m (Valid): ${withinRange} (${((withinRange/totalValidEntries)*100).toFixed(1)}%)`);
  console.log(`❌ Outside 100m: ${outsideRange} (${((outsideRange/totalValidEntries)*100).toFixed(1)}%)`);
  
  // Distance distribution
  const distances = validationResults.map(r => r.distance);
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const maxDistance = Math.max(...distances);
  const minDistance = Math.min(...distances);
  
  console.log(`\n📏 DISTANCE STATISTICS:`);
  console.log(`   Average Distance: ${avgDistance < 1000 ? Math.round(avgDistance) + 'm' : (avgDistance/1000).toFixed(2) + 'km'}`);
  console.log(`   Min Distance: ${Math.round(minDistance)}m`);
  console.log(`   Max Distance: ${maxDistance < 1000 ? Math.round(maxDistance) + 'm' : (maxDistance/1000).toFixed(2) + 'km'}`);
  
  // GPS precision analysis
  const precisions = validationResults.map(r => r.precision).filter(p => p > 0);
  if (precisions.length > 0) {
    const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
    console.log(`\n📡 GPS PRECISION ANALYSIS:`);
    console.log(`   Average GPS Precision: ±${Math.round(avgPrecision)}m`);
    console.log(`   Best Precision: ±${Math.round(Math.min(...precisions))}m`);
    console.log(`   Worst Precision: ±${Math.round(Math.max(...precisions))}m`);
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  
  if (withinRange / totalValidEntries > 0.8) {
    console.log(`✅ Proximity validation is working well (${((withinRange/totalValidEntries)*100).toFixed(1)}% within 100m)`);
  } else if (withinRange / totalValidEntries > 0.5) {
    console.log(`⚠️  Proximity validation needs improvement (only ${((withinRange/totalValidEntries)*100).toFixed(1)}% within 100m)`);
    console.log(`   Consider increasing validation radius to 150-200m`);
  } else {
    console.log(`❌ Proximity validation is too strict (only ${((withinRange/totalValidEntries)*100).toFixed(1)}% within 100m)`);
    console.log(`   Consider increasing validation radius significantly`);
  }
  
  if (avgDistance > 50) {
    console.log(`📍 Users are typically ${Math.round(avgDistance)}m away from properties`);
    console.log(`   This might be due to GPS accuracy or users rating from sidewalks/streets`);
  }
  
  // Check for potential GPS drift or spoofing
  const suspiciousEntries = validationResults.filter(r => r.distance > 500);
  if (suspiciousEntries.length > 0) {
    console.log(`\n🚨 SUSPICIOUS ENTRIES (>500m away):`);
    suspiciousEntries.forEach(entry => {
      console.log(`   Entry ${entry.entryNumber}: ${Math.round(entry.distance)}m from ${entry.address}`);
    });
  }
  
  // Save detailed results
  const analysisData = {
    summary: {
      totalEntries: totalValidEntries,
      withinValidationRange: withinRange,
      outsideValidationRange: outsideRange,
      validationSuccessRate: (withinRange/totalValidEntries)*100,
      averageDistance: avgDistance,
      averagePrecision: precisions.length > 0 ? precisions.reduce((a, b) => a + b, 0) / precisions.length : null,
      analyzedAt: new Date().toISOString()
    },
    entries: validationResults,
    recommendations: {
      currentValidationRadius: 100,
      suggestedValidationRadius: avgDistance > 100 ? Math.ceil(avgDistance * 1.5) : 100,
      gpsAccuracyIssues: avgDistance > 50,
      suspiciousEntries: suspiciousEntries.length
    }
  };
  
  fs.writeFileSync('proximity_validation_analysis.json', JSON.stringify(analysisData, null, 2));
  console.log('\n✅ Detailed analysis saved to proximity_validation_analysis.json');
}

// Run the analysis
analyzeProximityValidation();
