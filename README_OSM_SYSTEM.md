# OSM-Based Property Loading System

## Overview

This app now uses an intelligent property loading system that combines **OpenStreetMap (OSM)** data with a backend database to provide dynamic, real-time property discovery.

## How It Works

### 1. **Dynamic Property Discovery**
When you load the map, the system:
- Detects properties within **100 meters** of your location
- Queries OpenStreetMap via the Overpass API for buildings
- Checks the database for existing property data
- Combines both sources to show all available properties

### 2. **Automatic Database Persistence**
- When a property is loaded from OSM for the first time, it's automatically saved to the database
- The property gets a unique `osm_id` to prevent duplicates
- Future encounters with the same property load instantly from the database
- Ratings and reports are preserved across sessions

### 3. **User Interaction**
Each pin on the map allows you to:
- Submit ratings (noise, safety, cleanliness)
- Generate property reports
- View historical ratings from other users

## Architecture

### Components

#### 1. **OSM Service** (`src/services/osm.ts`)
- `fetchOSMBuildings()` - Queries Overpass API for buildings within radius
- `convertOSMToProperties()` - Converts OSM data to Property objects
- `getOSMPropertiesNearLocation()` - Combined fetch and convert

#### 2. **Property Service** (`src/services/properties.ts`)
- `getPropertiesOSMBased()` - Main function combining OSM + database
- `upsertOSMProperty()` - Saves/updates a single OSM property
- `upsertOSMProperties()` - Batch saves multiple properties
- `deletePropertiesWithinRadius()` - Testing utility

#### 3. **Map Component** (`src/components/ClusteredMapView.tsx`)
- Automatically loads properties when user location changes
- Shows 100m radius circle around user
- Displays property count and loading status

### Database Schema

```sql
-- Property table with OSM tracking
CREATE TABLE property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(Point, 4326),
    osm_id TEXT,  -- NEW: OpenStreetMap identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on OSM ID
CREATE UNIQUE INDEX property_osm_id_unique 
    ON property(osm_id) WHERE osm_id IS NOT NULL;
```

### Key Functions

#### `upsert_osm_property()`
Saves or updates a property from OSM data:
```sql
SELECT upsert_osm_property(
    'way/123456',           -- osm_id
    '123 Main St',          -- name
    '123 Main St, City',    -- address
    37.3220,                -- latitude
    -121.9800               -- longitude
);
```

#### `delete_properties_within_radius()`
Removes properties for testing:
```sql
SELECT delete_properties_within_radius(
    37.3220,    -- center latitude
    -121.9800,  -- center longitude
    1000        -- radius in meters
);
```

## Usage

### For End Users

1. **Open the app** and allow location access
2. **See the green circle** (100m radius) around your location
3. **Pins appear** for all properties within that radius
4. **Tap any pin** to:
   - Submit ratings
   - Generate reports
   - View property details

### For Developers

#### Running the Migration

```bash
# 1. Apply the database migration
# Run osm-property-migration.sql in Supabase SQL Editor

# 2. The app will automatically start using OSM data
npm start
```

#### Removing Test Properties

```bash
# Remove properties within 1km of test location
npx ts-node scripts/removeTestProperties.ts
```

#### Testing the System

1. Navigate to a location on the map
2. Watch console logs for OSM queries:
   ```
   🌐 Fetching OSM buildings within 100m...
   📊 Found 25 OSM elements
   🏠 Converted 25 OSM elements to properties
   📍 Found 10 existing properties in database
   🆕 Found 15 new properties to save
   💾 Saved 15 new properties to database
   ✅ Returning 25 total properties
   ```

## OpenStreetMap Integration

### Overpass API Query

The system uses the following query structure:

```overpassql
[out:json][timeout:25];
(
  node["building"](around:100,37.3220,-121.9800);
  way["building"](around:100,37.3220,-121.9800);
  relation["building"](around:100,37.3220,-121.9800);
);
out body;
>;
out skel qt;
```

### OSM Data Mapping

| OSM Field | Property Field | Example |
|-----------|---------------|---------|
| `type/id` | `osm_id` | `way/123456` |
| `tags.name` | `name` | `Empire State Building` |
| `tags.addr:*` | `address` | `123 Main St, City` |
| `lat/lon` | `lat/lng` | `37.3220, -121.9800` |

### Handling Different OSM Types

- **Node**: Direct lat/lon coordinates
- **Way**: Calculate centroid from node coordinates
- **Relation**: Calculate centroid from member coordinates

## Performance Considerations

### Optimizations

1. **100m Radius**: Small enough to load quickly, large enough to be useful
2. **Batch Upserts**: Saves 10 properties at a time to avoid overwhelming the database
3. **Deduplication**: Uses `osm_id` to prevent duplicate properties
4. **Fallback**: If OSM fails, falls back to database-only mode

### Caching Strategy

- **First Visit**: Queries OSM + Database (may take 2-3 seconds)
- **Return Visits**: Loads from database only (instant)
- **New Buildings**: Detected on next OSM query

## Error Handling

### OSM API Failures
- System falls back to database-only mode
- User sees existing properties
- Error logged to console

### Network Issues
- Graceful degradation
- Shows cached/database properties
- Retries on next location change

### Rate Limiting
- Overpass API has rate limits
- System respects timeout settings
- Batches requests when possible

## Testing

### Test Scenarios

1. **Fresh Area** (no database properties)
   - Should query OSM
   - Save all new properties
   - Display pins

2. **Existing Area** (all properties in database)
   - Should load from database
   - Skip OSM query (optimization)
   - Display instantly

3. **Mixed Area** (some database, some new OSM)
   - Query both sources
   - Save only new properties
   - Display combined results

### Test Location

**Address**: 1312 Centennial Court, San Jose, CA 95129
**Coordinates**: 37.3220, -121.9800
**Use Case**: Clear all properties within 1km for clean testing

```bash
npx ts-node scripts/removeTestProperties.ts
```

## Future Enhancements

### Potential Improvements

1. **Offline Mode**: Cache OSM data locally
2. **Property Types**: Filter by residential/commercial
3. **Manual Additions**: Allow users to add missing properties
4. **OSM Contributions**: Push user corrections back to OSM
5. **Expanded Radius**: User-configurable search radius

### Scalability

- Current system handles thousands of properties
- OSM queries are fast (< 2 seconds)
- Database queries are optimized with spatial indexes
- Clustering prevents map slowdown with many pins

## Troubleshooting

### "No properties found"
- Check location permissions
- Ensure you're in an area with buildings
- Try increasing the radius (modify code)

### "OSM query failed"
- Check internet connection
- Overpass API may be down (check status.openstreetmap.org)
- System falls back to database mode

### "Properties not saving"
- Check database migration applied
- Verify Supabase connection
- Check authentication status

### "Duplicate properties"
- Run deduplication query
- Check `osm_id` uniqueness constraint
- May need to clear and re-import

## Resources

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass API](https://overpass-api.de/)
- [Overpass Turbo](https://overpass-turbo.eu/) - Query testing
- [OSM Wiki](https://wiki.openstreetmap.org/)

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database migration applied
3. Test with the provided test location
4. Review this documentation

---

**Version**: 1.0.0  
**Last Updated**: September 30, 2025  
**System**: OSM-Based Dynamic Property Loading
