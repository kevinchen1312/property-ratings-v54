/**
 * Check OSM Data for a Specific Address
 * Usage: npx tsx scripts/checkOSMAddress.ts
 */

// Check for 5952 West Walbrook Drive
const address = "5952 West Walbrook Drive";
const lat = 37.2995; // Approximate Walbrook area
const lng = -122.0097;
const radius = 100; // 100m to be sure

const query = `
[out:json][timeout:25];
(
  node["building"]["addr:housenumber"="5952"](around:${radius},${lat},${lng});
  way["building"]["addr:housenumber"="5952"](around:${radius},${lat},${lng});
  
  node["building"]["addr:street"~"Walbrook",i](around:${radius},${lat},${lng});
  way["building"]["addr:street"~"Walbrook",i](around:${radius},${lat},${lng});
);
out body;
>;
out skel qt;
`.trim();

async function checkAddress() {
  console.log(`🔍 Checking OSM for: ${address}`);
  console.log(`📍 Search center: ${lat}, ${lng}`);
  console.log(`📏 Radius: ${radius}m\n`);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`📊 Total OSM elements found: ${data.elements?.length || 0}\n`);

    if (data.elements && data.elements.length > 0) {
      console.log('✅ FOUND BUILDINGS:\n');
      data.elements.forEach((el: any) => {
        if (el.tags?.building) {
          console.log(`Type: ${el.type}/${el.id}`);
          console.log(`  House Number: ${el.tags['addr:housenumber'] || 'MISSING'}`);
          console.log(`  Street: ${el.tags['addr:street'] || 'MISSING'}`);
          console.log(`  City: ${el.tags['addr:city'] || 'MISSING'}`);
          console.log(`  Building Type: ${el.tags.building}`);
          console.log(`  Name: ${el.tags.name || 'none'}`);
          if (el.lat && el.lon) {
            console.log(`  Coords: ${el.lat}, ${el.lon}`);
          }
          console.log('');
        }
      });
    } else {
      console.log('❌ NO BUILDINGS FOUND WITH ADDRESS DATA\n');
      console.log('This means either:');
      console.log('1. The building exists but has no addr:housenumber tag in OSM');
      console.log('2. The building is not in OSM at all');
      console.log('3. The address is spelled differently in OSM');
      console.log('\n💡 You can check and add it manually at: https://www.openstreetmap.org/');
      console.log(`   Search for: ${address}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAddress();

