# Property Ratings Database Migration

This SQL migration sets up the complete database schema for the Property Ratings app with PostGIS spatial functionality.

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. **Open your Supabase project dashboard**
2. **Navigate to SQL Editor** (left sidebar)
3. **Create a new query**
4. **Copy and paste** the entire contents of `supabase-migration.sql`
5. **Click "Run"** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
# Then paste the migration content in the SQL editor
```

## What This Migration Creates

### 🗄️ **Tables**
- **`app_user`** - User profiles with email and display name
- **`property`** - Properties with location data and PostGIS geometry
- **`rating`** - User ratings with proximity validation

### 🔧 **Functions & Triggers**
- **Auto-populate geography** from lat/lng coordinates
- **Proximity validation** - Users must be within 100m to rate
- **Daily unique ratings** - One rating per user/property/attribute per day

### 📊 **Views & Helpers**
- **`property_ratings_summary`** - Average ratings per property
- **`recent_ratings`** - Recent ratings with user/property details
- **`find_nearby_properties()`** - Function to find properties near a location

### 🔒 **Security**
- **Row Level Security (RLS)** enabled on all tables
- **Policies** for secure data access
- **Proper permissions** for anon and authenticated users

## Sample Usage

### Find nearby properties:
```sql
SELECT * FROM find_nearby_properties(40.7128, -74.0060, 500);
```

### Get property ratings summary:
```sql
SELECT * FROM property_ratings_summary WHERE name LIKE '%Downtown%';
```

### View recent ratings:
```sql
SELECT * FROM recent_ratings LIMIT 10;
```

## Testing the Migration

The migration includes sample data:
- 2 test users
- 3 sample properties
- Sample rating data (commented out due to proximity validation)

## Important Notes

⚠️ **Proximity Validation**: Users must be within 100 meters of a property to submit ratings

⚠️ **Daily Limits**: Users can only submit one rating per property attribute per calendar day

⚠️ **PostGIS Required**: This migration requires the PostGIS extension to be available

## Troubleshooting

If you encounter errors:

1. **PostGIS not available**: Ensure your Supabase project has PostGIS enabled
2. **Permission errors**: Check that your user has the necessary database permissions
3. **Sample data fails**: The proximity validation may prevent sample ratings from being inserted

## Next Steps

After running the migration, you can:

1. **Update your app's TypeScript types** to match the new schema
2. **Implement the rating submission logic** in your React Native app
3. **Add property discovery features** using the nearby properties function
4. **Create admin functions** for managing properties

The database is now ready for your Property Ratings app! 🎉
