# OSM System Setup Guide

## Quick Start

This guide will help you complete the setup of the new OSM-based property loading system.

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `osm-property-migration.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** to execute the migration

### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push osm-property-migration.sql
```

### What This Does

The migration will:
- ✅ Add `osm_id` column to the `property` table
- ✅ Create unique index on `osm_id`
- ✅ Create `upsert_osm_property()` function
- ✅ Create `delete_properties_within_radius()` function
- ✅ Grant necessary permissions

## Step 2: Remove Test Properties

Run the cleanup script to remove all properties within 1km of the test location:

```bash
npx ts-node scripts/removeTestProperties.ts
```

**Expected Output:**
```
🗑️  REMOVING TEST PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Target: 1312 Centennial Court, San Jose, CA 95129
📌 Coordinates: 37.322, -121.98
📏 Radius: 1000m (1 km)

✅ DELETION COMPLETE
🗑️  Deleted 245 properties

💡 245 properties removed from the database
🔄 The map will now load fresh OSM data for this area

✅ Script completed successfully
```

## Step 3: Test the System

### Launch the App

```bash
npm start
```

### Navigate to Test Location

1. Open the app on your device/emulator
2. Grant location permissions when prompted
3. Navigate to **1312 Centennial Court, San Jose, CA 95129** (or any location)
4. Watch the console for OSM loading logs

### Expected Console Output

```
🌐 Fetching OSM buildings within 100m of (37.322, -121.98)...
📊 Found 25 OSM elements
🏠 Converted 25 OSM elements to properties
📍 Found 0 existing properties in database
🆕 Found 25 new properties to save
📝 Upserted batch 1: 10 properties
📝 Upserted batch 2: 10 properties
📝 Upserted batch 3: 5 properties
💾 Saved 25 new properties to database
✅ Returning 25 total properties
```

### Visual Indicators

- **Green circle**: 100m radius around your location
- **Pins**: Each OSM building within the circle
- **Stats bar**: Shows "OSM Proximity: X properties (100m)"

## Step 4: Verify Functionality

### Test Pin Interaction

1. **Tap any pin** on the map
2. You should see the property details modal
3. **Submit a rating** (noise, safety, or cleanliness)
4. **Generate a report** if you have credits

### Test Database Persistence

1. Move away from the test location
2. Return to the same location
3. Properties should load **instantly** from the database
4. Console should show: "Found X existing properties in database"

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] Test properties removed (script ran without errors)
- [ ] App launches and shows map
- [ ] Green 100m circle visible around user location
- [ ] Pins appear within the circle
- [ ] Console shows OSM loading logs
- [ ] Tapping pins shows property details
- [ ] Can submit ratings
- [ ] Returning to same location loads from database

## Troubleshooting

### Migration Errors

**Error**: "column osm_id already exists"
- **Solution**: The migration has already been applied. Safe to ignore.

**Error**: "function upsert_osm_property already exists"
- **Solution**: Use `CREATE OR REPLACE FUNCTION` (already in the migration)

### Script Errors

**Error**: "EXPO_PUBLIC_SUPABASE_URL is not defined"
- **Solution**: Ensure `.env` file exists with Supabase credentials

**Error**: "function delete_properties_within_radius does not exist"
- **Solution**: Apply the database migration first (Step 1)

### App Errors

**Error**: "No properties found"
- **Solution**: 
  - Check location permissions
  - Ensure internet connection (for OSM API)
  - Try a different location with more buildings

**Error**: "OSM API timeout"
- **Solution**:
  - System will fallback to database-only mode
  - Try again later
  - Check Overpass API status

## System Behavior

### First Visit to a Location
- Queries OpenStreetMap
- Saves new properties to database
- May take 2-3 seconds

### Subsequent Visits
- Loads from database only
- Instant loading
- Still checks OSM for new buildings

### Radius Changes
- User moves: System re-queries for new 100m radius
- New properties auto-saved
- Existing properties reused

## Performance Notes

- **OSM Query Time**: 1-3 seconds
- **Database Save Time**: < 1 second for 10 properties
- **Total First Load**: 3-5 seconds
- **Cached Load**: < 0.5 seconds

## What's Different?

### Before (Old System)
- Properties pre-loaded into database
- Required manual import scripts
- Static property list
- No automatic discovery

### After (New System)
- ✅ Properties loaded dynamically from OSM
- ✅ Automatic database persistence
- ✅ Real-time discovery of new buildings
- ✅ No manual imports needed
- ✅ 100m radius instead of 200m
- ✅ Smarter caching strategy

## Next Steps

After successful setup:

1. **Test in different locations** to verify OSM integration
2. **Monitor console logs** for any errors
3. **Check database** to see new properties being saved
4. **Submit ratings** to test full workflow
5. **Generate reports** to verify end-to-end functionality

## Need Help?

- Check `README_OSM_SYSTEM.md` for detailed documentation
- Review console logs for specific error messages
- Verify all migration steps completed
- Test with the provided coordinates first

---

**Setup Version**: 1.0.0  
**Date**: September 30, 2025
