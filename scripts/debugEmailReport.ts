// Debug script to check what data we're actually getting
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oyphcjbickujybvbeame.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugData() {
  console.log('🔍 Debugging Report Data\n');
  
  const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';
  
  // 1. Check property exists
  console.log('1. Checking property...');
  const { data: property, error: propError } = await supabase
    .from('property')
    .select('*')
    .eq('id', propertyId)
    .single();
    
  if (propError) {
    console.log('❌ Property error:', propError);
    return;
  }
  
  console.log('✅ Property found:', property.name);
  console.log('   Address:', property.address);
  console.log('   ID:', property.id);
  
  // 2. Check ratings for this property
  console.log('\n2. Checking ratings...');
  const { data: ratings, error: ratingsError } = await supabase
    .from('rating')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
    
  if (ratingsError) {
    console.log('❌ Ratings error:', ratingsError);
    return;
  }
  
  console.log(`✅ Found ${ratings.length} ratings for this property:`);
  
  ratings.forEach((rating, index) => {
    const date = new Date(rating.created_at);
    console.log(`   ${index + 1}. ${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${rating.attribute}: ${rating.stars} stars (ID: ${rating.id})`);
  });
  
  // 3. Calculate averages
  console.log('\n3. Calculating averages...');
  const noiseRatings = ratings.filter(r => r.attribute === 'noise').map(r => r.stars);
  const friendlinessRatings = ratings.filter(r => r.attribute === 'friendliness').map(r => r.stars);
  const cleanlinessRatings = ratings.filter(r => r.attribute === 'cleanliness').map(r => r.stars);
  
  console.log(`   Noise: ${noiseRatings.length} ratings - ${noiseRatings.join(', ')} - Avg: ${noiseRatings.length > 0 ? (noiseRatings.reduce((a, b) => a + b, 0) / noiseRatings.length).toFixed(1) : 'N/A'}`);
  console.log(`   Friendliness: ${friendlinessRatings.length} ratings - ${friendlinessRatings.join(', ')} - Avg: ${friendlinessRatings.length > 0 ? (friendlinessRatings.reduce((a, b) => a + b, 0) / friendlinessRatings.length).toFixed(1) : 'N/A'}`);
  console.log(`   Cleanliness: ${cleanlinessRatings.length} ratings - ${cleanlinessRatings.join(', ')} - Avg: ${cleanlinessRatings.length > 0 ? (cleanlinessRatings.reduce((a, b) => a + b, 0) / cleanlinessRatings.length).toFixed(1) : 'N/A'}`);
  
  // 4. Check what our report would show
  console.log('\n4. What the report will display:');
  console.log(`   First 10 ratings (most recent first):`);
  const recentRatings = ratings.slice(0, 10);
  recentRatings.forEach((rating, index) => {
    const date = new Date(rating.created_at);
    console.log(`   ${index + 1}. ${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${rating.attribute}: ${rating.stars} stars`);
  });
}

debugData().catch(console.error);

