import { createClient } from '@supabase/supabase-js';

// Use the same credentials as in app.config.ts
const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listRatedAddresses() {
  console.log('📍 Properties You Have Rated:\n');

  try {
    // Get unique property addresses that have ratings
    const { data: ratedProperties, error } = await supabase
      .from('rating')
      .select('property_address, property_name, property_lat, property_lng')
      .not('property_address', 'is', null)
      .order('property_address');

    if (error) {
      console.error('❌ Error fetching rated properties:', error.message);
      return;
    }

    if (!ratedProperties || ratedProperties.length === 0) {
      console.log('📭 No rated properties found.');
      return;
    }

    // Get unique addresses
    const uniqueAddresses = new Map();
    ratedProperties.forEach(prop => {
      if (prop.property_address) {
        uniqueAddresses.set(prop.property_address, {
          name: prop.property_name,
          address: prop.property_address,
          lat: prop.property_lat,
          lng: prop.property_lng
        });
      }
    });

    console.log(`Found ${uniqueAddresses.size} unique properties with ratings:\n`);

    let index = 1;
    for (const [address, info] of uniqueAddresses) {
      console.log(`${index}. 🏠 ${info.name}`);
      console.log(`   📍 ${info.address}`);
      console.log(`   🗺️ Coordinates: ${info.lat}, ${info.lng}`);
      console.log('');
      index++;
    }

    // Group by area
    console.log('\n📊 Properties by Area:');
    const areas = new Map();
    
    for (const [address, info] of uniqueAddresses) {
      const street = address.split(',')[0].split(' ').slice(-2).join(' '); // Get street name
      if (!areas.has(street)) {
        areas.set(street, []);
      }
      areas.get(street).push(info.address);
    }

    for (const [area, addresses] of areas) {
      console.log(`\n🏘️ ${area}:`);
      addresses.forEach((addr: string) => console.log(`   • ${addr}`));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

listRatedAddresses();
