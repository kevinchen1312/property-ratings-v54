/**
 * Check the exact location of 5952 West Walbrook Drive
 */

const query = `
[out:json][timeout:25];
(
  relation["addr:housenumber"="5952"]["addr:street"="West Walbrook Drive"];
);
out body;
>;
out skel qt;
`.trim();

async function checkLocation() {
  console.log('🔍 Checking exact location of relation 5952...\n');

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    const data = await response.json();
    
    const relation = data.elements.find((el: any) => el.type === 'relation');
    
    if (relation) {
      console.log('Found Relation:');
      console.log(`  ID: relation/${relation.id}`);
      console.log(`  Tags:`, relation.tags);
      console.log(`  Members:`, relation.members?.length, 'members');
      
      // Get all the nodes
      const nodes = data.elements.filter((el: any) => el.type === 'node' && el.lat && el.lon);
      
      if (nodes.length > 0) {
        // Calculate actual centroid from all nodes
        const avgLat = nodes.reduce((sum: number, n: any) => sum + n.lat, 0) / nodes.length;
        const avgLon = nodes.reduce((sum: number, n: any) => sum + n.lon, 0) / nodes.length;
        
        console.log(`\n📍 Calculated Center from ${nodes.length} nodes:`);
        console.log(`  Latitude: ${avgLat}`);
        console.log(`  Longitude: ${avgLon}`);
        
        // Get bounds
        const minLat = Math.min(...nodes.map((n: any) => n.lat));
        const maxLat = Math.max(...nodes.map((n: any) => n.lat));
        const minLon = Math.min(...nodes.map((n: any) => n.lon));
        const maxLon = Math.max(...nodes.map((n: any) => n.lon));
        
        console.log(`\n📦 Bounds:`);
        console.log(`  Lat: ${minLat} to ${maxLat}`);
        console.log(`  Lon: ${minLon} to ${maxLon}`);
      }
    } else {
      console.log('❌ Relation not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkLocation();

