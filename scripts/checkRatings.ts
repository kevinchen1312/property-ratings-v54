import { createClient } from '@supabase/supabase-js';

// Use the same credentials as in app.config.ts
const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRatings() {
  console.log('🔍 Checking submitted ratings...\n');

  try {
    // Get all ratings with property and user info
    // Try enhanced table first, fallback to joined query
    const { data: ratings, error } = await supabase
      .from('rating')
      .select(`
        id,
        attribute,
        stars,
        user_lat,
        user_lng,
        created_at,
        property_name,
        property_address,
        property_lat,
        property_lng,
        property:property_id (
          name,
          address,
          lat,
          lng
        ),
        user:user_id (
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching ratings:', error.message);
      return;
    }

    if (!ratings || ratings.length === 0) {
      console.log('📭 No ratings found in the database.');
      console.log('\n💡 This could mean:');
      console.log('   • No ratings have been submitted yet');
      console.log('   • Ratings were submitted to a different database');
      console.log('   • There might be an authentication issue');
      return;
    }

    console.log(`📊 Found ${ratings.length} rating(s):\n`);

    // Group ratings by property and user
    const groupedRatings = new Map();

    for (const rating of ratings) {
      const property = Array.isArray(rating.property) ? rating.property[0] : rating.property;
      const user = Array.isArray(rating.user) ? rating.user[0] : rating.user;
      
      const key = `${property?.address || 'Unknown Property'} - ${user?.email || 'Unknown User'}`;
      
      if (!groupedRatings.has(key)) {
        groupedRatings.set(key, {
          property: property,
          user: user,
          ratings: [],
          submittedAt: rating.created_at,
          userLocation: { lat: rating.user_lat, lng: rating.user_lng }
        });
      }
      
      groupedRatings.get(key)!.ratings.push({
        attribute: rating.attribute,
        stars: rating.stars
      });
    }

    // Display grouped ratings
    let index = 1;
    for (const [key, data] of groupedRatings) {
      console.log(`${index}. 🏠 ${data.property?.name || 'Unknown Property'}`);
      console.log(`   📍 ${data.property?.address || 'Unknown Address'}`);
      console.log(`   👤 Rated by: ${data.user?.display_name || data.user?.email || 'Unknown User'}`);
      console.log(`   📅 Submitted: ${new Date(data.submittedAt).toLocaleString()}`);
      console.log(`   📍 User location: ${data.userLocation.lat.toFixed(6)}, ${data.userLocation.lng.toFixed(6)}`);
      console.log(`   ⭐ Ratings:`);
      
      for (const rating of data.ratings) {
        const stars = '★'.repeat(rating.stars) + '☆'.repeat(5 - rating.stars);
        console.log(`      ${rating.attribute}: ${stars} (${rating.stars}/5)`);
      }
      
      console.log('');
      index++;
    }

    // Summary statistics
    console.log('📈 Summary:');
    console.log(`   • Total ratings: ${ratings.length}`);
    console.log(`   • Unique submissions: ${groupedRatings.size}`);
    console.log(`   • Properties rated: ${new Set(ratings.map(r => {
      const property = Array.isArray(r.property) ? r.property[0] : r.property;
      return property?.address;
    })).size}`);
    console.log(`   • Users who rated: ${new Set(ratings.map(r => {
      const user = Array.isArray(r.user) ? r.user[0] : r.user;
      return user?.email;
    })).size}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Also check users and properties for context
async function checkDatabaseStatus() {
  console.log('\n🗄️ Database Status Check:\n');

  try {
    // Check users
    const { count: userCount, error: userError } = await supabase
      .from('app_user')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.log('❌ Error checking users:', userError.message);
    } else {
      console.log(`👥 Users in database: ${userCount || 0}`);
    }

    // Check properties
    const { count: propertyCount, error: propertyError } = await supabase
      .from('property')
      .select('*', { count: 'exact', head: true });

    if (propertyError) {
      console.log('❌ Error checking properties:', propertyError.message);
    } else {
      console.log(`🏠 Properties in database: ${propertyCount || 0}`);
    }

    // Check ratings
    const { count: ratingCount, error: ratingError } = await supabase
      .from('rating')
      .select('*', { count: 'exact', head: true });

    if (ratingError) {
      console.log('❌ Error checking ratings:', ratingError.message);
    } else {
      console.log(`⭐ Ratings in database: ${ratingCount || 0}`);
    }

  } catch (error) {
    console.error('❌ Database status check failed:', error);
  }
}

async function main() {
  await checkDatabaseStatus();
  await checkRatings();
}

main();
