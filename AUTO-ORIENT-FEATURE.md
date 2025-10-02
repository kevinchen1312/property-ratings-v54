# 🧭 Auto-Orient Map Feature

## What Was Added

A new feature that automatically rotates the map to match your device's facing direction, with a toggle to turn it on/off.

## How It Works

### Settings Toggle
- Open the app and tap the **⚙️ Settings** button in the top-right
- You'll see a new option: **🧭 Auto-Orient Map**
- Toggle it ON (green) or OFF (gray)
- Your preference is saved and persists across app sessions

### Auto-Orientation Behavior
**When ENABLED (default):**
- Map automatically rotates to match the direction your device is facing
- Smooth rotation animation (300ms duration)
- If you manually rotate the map, auto-rotation is **permanently disabled**
- Press the 📍 center button to re-enable auto-rotation and recenter on your location

**When DISABLED:**
- Map shows initial device direction on load
- No continuous rotation
- Map only rotates when you manually rotate it

### Center Button
- A custom 📍 button is displayed on the bottom-right of the map
- Press it to:
  - Re-center the map on your current location
  - Re-enable auto-rotation (if it was disabled by manual interaction)
  - Reset the map heading to match your device's current direction

## Technical Details

### Files Modified

1. **`src/navigation/index.tsx`**
   - Added `autoOrientEnabled` state (default: `true`)
   - Added AsyncStorage to persist user preference
   - Added toggle switch in settings modal
   - Pass `autoOrientEnabled` prop to MapScreen

2. **`src/screens/MapScreen.tsx`**
   - Accept `autoOrientEnabled` prop
   - Pass it down to ClusteredMapView

3. **`src/components/ClusteredMapView.tsx`**
   - Accept `autoOrientEnabled` prop
   - Use `Location.watchHeadingAsync()` to continuously track device heading
   - Automatically rotate map camera to match heading (when enabled)
   - Detect manual rotation with `onPanDrag` handler
   - **Permanently disable** auto-rotation after manual interaction
   - Added custom center button (📍) to re-enable auto-rotation and recenter
   - Hide default `showsMyLocationButton` in favor of custom button
   - Clean up heading subscription on unmount or setting change

## Testing Checklist

- [ ] Open settings and verify toggle is visible
- [ ] Toggle auto-orient ON - map should rotate as you turn your device
- [ ] Manually rotate the map - auto-rotation should **permanently stop**
- [ ] Press the 📍 center button - auto-rotation should resume and map should recenter
- [ ] Toggle auto-orient OFF - map should stop rotating automatically
- [ ] Close and reopen the app - setting should be remembered
- [ ] Verify performance is smooth (no lag or jitter)
- [ ] Verify center button is visible and positioned correctly (bottom-right)

## Notes

- Feature is **enabled by default** for new users
- Uses device compass/magnetometer for heading data
- Requires location permissions (already requested by the app)
- Smooth 300ms animation for rotation transitions
- Automatic cleanup prevents memory leaks

