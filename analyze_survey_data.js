// Node.js script to analyze the property survey CSV data
const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  // Handle semicolon-separated values with quoted fields
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
  fields.push(current.trim()); // Add the last field
  
  return fields;
}

function analyzeSurveyData() {
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
  console.log('📊 PROPERTY SURVEY DATA ANALYSIS');
  console.log('=' .repeat(50));
  console.log(`📁 Found ${lines.length - 1} survey responses`);
  
  // Key column indices
  const addressCol = headers.indexOf('What is the address of the property you are rating?');
  const photoUrlCol = headers.indexOf('How does the property look right now?_URL');
  const photoNameCol = headers.indexOf('How does the property look right now?');
  const latCol = headers.indexOf('_Please verify your proximity to the property you are rating_latitude');
  const lngCol = headers.indexOf('_Please verify your proximity to the property you are rating_longitude');
  const quietCol = headers.indexOf('How quiet is the property right now?');
  const safeCol = headers.indexOf('How safe is the property right now?');
  const cleanCol = headers.indexOf('How clean is the property right now?');
  const friendlyCol = headers.indexOf('How friendly is the property right now?');
  const nameCol = headers.indexOf('What is your name?');
  const emailCol = headers.indexOf('What is your email address?');
  const timeCol = headers.indexOf('_submission_time');
  
  // Parse data rows
  const surveyData = [];
  const properties = new Map();
  
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    
    if (fields.length < headers.length) continue;
    
    const entry = {
      address: fields[addressCol]?.replace(/"/g, '') || '',
      photoUrl: fields[photoUrlCol]?.replace(/"/g, '') || '',
      photoName: fields[photoNameCol]?.replace(/"/g, '') || '',
      latitude: parseFloat(fields[latCol]?.replace(/"/g, '') || '0'),
      longitude: parseFloat(fields[lngCol]?.replace(/"/g, '') || '0'),
      ratings: {
        quiet: fields[quietCol]?.replace(/"/g, '') || '',
        safe: fields[safeCol]?.replace(/"/g, '') || '',
        clean: fields[cleanCol]?.replace(/"/g, '') || '',
        friendly: fields[friendlyCol]?.replace(/"/g, '') || ''
      },
      surveyor: fields[nameCol]?.replace(/"/g, '') || '',
      email: fields[emailCol]?.replace(/"/g, '') || '',
      timestamp: fields[timeCol]?.replace(/"/g, '') || ''
    };
    
    if (entry.address) {
      surveyData.push(entry);
      
      // Group by property
      if (!properties.has(entry.address)) {
        properties.set(entry.address, []);
      }
      properties.get(entry.address).push(entry);
    }
  }
  
  console.log(`\n🏠 Properties Surveyed: ${properties.size}`);
  console.log(`📸 Total Survey Entries: ${surveyData.length}`);
  console.log(`📷 Entries with Photos: ${surveyData.filter(e => e.photoUrl).length}`);
  
  // Analyze each property
  console.log('\n📍 PROPERTY BREAKDOWN:');
  properties.forEach((entries, address) => {
    console.log(`\n🏠 ${address}`);
    console.log(`   📊 ${entries.length} survey(s)`);
    
    // Calculate average ratings
    const ratingCategories = ['quiet', 'safe', 'clean', 'friendly'];
    ratingCategories.forEach(category => {
      const validRatings = entries
        .map(e => e.ratings[category])
        .filter(r => r && !isNaN(parseInt(r)))
        .map(r => parseInt(r));
      
      if (validRatings.length > 0) {
        const avg = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
        console.log(`   ${category.padEnd(8)}: ${avg.toFixed(1)}/5 (${validRatings.length} ratings)`);
      }
    });
    
    // Show photos
    const photosWithUrls = entries.filter(e => e.photoUrl);
    if (photosWithUrls.length > 0) {
      console.log(`   📸 Photos: ${photosWithUrls.length}`);
      photosWithUrls.forEach((entry, i) => {
        console.log(`      ${i + 1}. ${entry.photoName}`);
      });
    }
    
    // Show coordinates
    const coords = entries.filter(e => e.latitude && e.longitude);
    if (coords.length > 0) {
      const avgLat = coords.reduce((sum, e) => sum + e.latitude, 0) / coords.length;
      const avgLng = coords.reduce((sum, e) => sum + e.longitude, 0) / coords.length;
      console.log(`   📍 Avg Location: ${avgLat.toFixed(6)}, ${avgLng.toFixed(6)}`);
    }
  });
  
  // Photo URL analysis
  console.log('\n📸 PHOTO ANALYSIS:');
  const photoEntries = surveyData.filter(e => e.photoUrl);
  
  if (photoEntries.length > 0) {
    console.log(`\n🔗 Photo URLs found: ${photoEntries.length}`);
    console.log('📋 Photo Details:');
    
    photoEntries.forEach((entry, i) => {
      console.log(`\n${i + 1}. ${entry.photoName}`);
      console.log(`   🏠 Property: ${entry.address}`);
      console.log(`   🔗 URL: ${entry.photoUrl.substring(0, 80)}...`);
      console.log(`   📅 Time: ${entry.timestamp}`);
      
      // Show ratings for this photo
      Object.entries(entry.ratings).forEach(([category, rating]) => {
        if (rating && !isNaN(parseInt(rating))) {
          console.log(`   ⭐ ${category}: ${rating}/5`);
        }
      });
    });
    
    // Generate import suggestions
    console.log('\n💡 INTEGRATION SUGGESTIONS:');
    console.log('1. Add "safety" rating category to your app (currently missing)');
    console.log('2. Implement photo upload functionality');
    console.log('3. Import this coordinate data as seed properties');
    console.log('4. Use this as demo data for potential users');
    
    // Generate SQL for property import
    console.log('\n📝 SQL IMPORT SCRIPT:');
    console.log('-- Add these properties to your database:');
    
    properties.forEach((entries, address) => {
      const coords = entries.filter(e => e.latitude && e.longitude);
      if (coords.length > 0) {
        const avgLat = coords.reduce((sum, e) => sum + e.latitude, 0) / coords.length;
        const avgLng = coords.reduce((sum, e) => sum + e.longitude, 0) / coords.length;
        
        console.log(`INSERT INTO property (name, address, lat, lng) VALUES ('${address}', '${address}', ${avgLat}, ${avgLng}) ON CONFLICT (address) DO NOTHING;`);
      }
    });
    
  } else {
    console.log('❌ No photo URLs found in the data');
  }
  
  // Save analysis to file
  const analysisData = {
    summary: {
      totalEntries: surveyData.length,
      propertiesCount: properties.size,
      photosCount: photoEntries.length,
      analyzedAt: new Date().toISOString()
    },
    properties: Array.from(properties.entries()).map(([address, entries]) => ({
      address,
      entryCount: entries.length,
      entries: entries
    })),
    photoUrls: photoEntries.map(e => ({
      address: e.address,
      photoName: e.photoName,
      photoUrl: e.photoUrl,
      timestamp: e.timestamp,
      ratings: e.ratings
    }))
  };
  
  fs.writeFileSync('survey_analysis.json', JSON.stringify(analysisData, null, 2));
  console.log('\n✅ Analysis saved to survey_analysis.json');
}

// Run the analysis
analyzeSurveyData();
