# Search Bar Swipe-to-Dismiss Implementation

## Overview

This document describes the implementation of a native-feeling swipe-to-dismiss feature for the search bar in the React Native (Expo) app. When the user taps into the search bar and the keyboard appears, they can swipe down to dismiss both the keyboard and the search bar's focused state, returning the layout to its default position.

## Features

✅ **Multiple Dismissal Paths:**
- Swipe down on the search bar itself
- Drag down anywhere on scrollable content (native `keyboardDismissMode="on-drag"`)
- Tap outside the search input (when implemented on specific screens)
- Press "Search" or "Submit" on the keyboard

✅ **Native Feel:**
- Works on both iOS and Android
- Smooth animations with no layout jumps
- Proper keyboard avoiding behavior
- Debounced gestures to prevent double-firing

✅ **Accessibility:**
- Clear button always visible
- Standard keyboard dismissal still works
- VoiceOver/TalkBack compatible

## Architecture

### Components Created

#### 1. `src/components/SearchBar.tsx`
Reusable search bar component with forward ref support.

**Key Features:**
- Exposes `focus()`, `blur()`, and `clear()` methods via `useImperativeHandle`
- Built-in clear button
- Customizable styling via `containerStyle` prop
- TypeScript typed with `SearchBarHandle` interface

**Usage:**
```tsx
const searchRef = useRef<SearchBarHandle>(null);

<SearchBar
  ref={searchRef}
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="Search..."
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  onSubmitEditing={handleSubmit}
/>

// Programmatically blur:
searchRef.current?.blur();
```

#### 2. `src/utils/keyboard.ts`
Keyboard dismissal utilities.

**Key Function:**
```tsx
dismissSearch(searchRef);
```

Uses `requestAnimationFrame` to avoid race conditions when dismissing keyboard and blurring input simultaneously.

#### 3. `src/screens/SearchDemoScreen.tsx`
Complete demo screen showing all dismissal paths working together.

**Demonstrates:**
- Scroll-based dismissal (`keyboardDismissMode="on-drag"`)
- Swipe gesture on search bar
- Tap-outside-to-dismiss pattern
- Filtered list results
- Proper `KeyboardAvoidingView` setup

### Integration Points

#### App.tsx
Added `GestureHandlerRootView` wrapper:
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

#### MapScreen.tsx
Integrated swipe-to-dismiss into existing search functionality:

1. **State Management:**
```tsx
const [isSearchFocused, setIsSearchFocused] = useState(false);
const isDismissing = useRef(false);
```

2. **Gesture Handler:**
```tsx
const swipeDownGesture = Gesture.Pan()
  .onUpdate((event) => {
    // Threshold: 20px movement or 1000px/sec velocity
    if (event.translationY > 20 || event.velocityY > 1000) {
      if (!isDismissing.current && isSearchFocused) {
        handleDismissSearch();
      }
    }
  })
  .minDistance(15)
  .activeOffsetY([15, 9999])
  .failOffsetY(-10)
  .simultaneousWithExternalGesture();
```

3. **Render:**
```tsx
{/* Search Bar */}
<Animated.View style={[styles.searchContainer, { 
  bottom: Animated.add(keyboardHeight, 10)
}]}>
  <TextInput
    style={styles.searchInput}
    value={searchQuery}
    onChangeText={handleSearch}
    onFocus={() => setIsSearchFocused(true)}
    onBlur={() => setIsSearchFocused(false)}
  />
</Animated.View>

{/* Swipe-down gesture overlay when keyboard is visible */}
{isSearchFocused && (
  <GestureDetector gesture={swipeDownGesture}>
    <Animated.View style={[styles.swipeOverlay, { 
      bottom: 0,
      height: Animated.add(keyboardHeight, 60)
    }]} />
  </GestureDetector>
)}
```

**Important:** The gesture is applied to a transparent overlay that only appears when the keyboard is visible, not directly on the TextInput. This prevents interference with normal taps and typing.

## Configuration

### Gesture Sensitivity Tuning

In `MapScreen.tsx` (lines 136-147), adjust these values:

```tsx
// Minimum downward movement in pixels
if (event.translationY > 20) { ... }

// Minimum swipe velocity in pixels/second
if (event.velocityY > 1000) { ... }

// Gesture activation distance
.minDistance(15)

// Active offset range [min, max] for Y-axis
.activeOffsetY([15, 9999])
```

**Current Settings (Conservative):**
- `translationY > 20` - Requires clear downward movement
- `velocityY > 1000` - Requires moderate swipe speed
- `minDistance(15)` - Must move 15px before gesture activates
- `simultaneousWithExternalGesture()` - Won't block other gestures

**Guidelines:**
- **Lower translationY** (e.g., 12-15) = more sensitive, triggers with smaller swipes
- **Higher translationY** (e.g., 25-30) = less sensitive, requires longer swipes
- **Lower velocityY** (e.g., 600-800) = triggers on slower swipes
- **Higher velocityY** (e.g., 1200+) = requires fast, deliberate swipes

### Platform-Specific Behavior

#### iOS
- Uses `KeyboardAvoidingView` with `behavior="padding"`
- Smooth keyboard animations via `keyboardWillShow/Hide` events
- Native swipe-to-dismiss on scroll views

#### Android
- Relies on `android:windowSoftInputMode="adjustResize"` (set in app.json)
- Uses `keyboardDidShow/Hide` events (no "will" events)
- May need to test `behavior="height"` if `padding` causes issues

## Dependencies

```json
{
  "react-native-gesture-handler": "^2.x.x",
  "react-native-reanimated": "^3.x.x"
}
```

Installed via:
```bash
npx expo install react-native-gesture-handler react-native-reanimated
```

## Testing Checklist

- [x] Focus search bar, start typing, then swipe down on search bar → dismisses
- [x] Focus search bar, then drag down on scrollable content → dismisses
- [x] Tap outside search bar → dismisses (when implemented)
- [x] Press "Search" on keyboard → dismisses
- [x] No layout jump when dismissing
- [x] Works on iOS simulator
- [x] Works on Android emulator
- [x] Fast repeated swipes don't cause issues (debounced)
- [x] VoiceOver/TalkBack can still access clear button

## Navigation

To access the demo screen:
1. Build and run the app
2. Navigate to the SearchDemo screen (add a button in your UI to navigate)
3. Or use deep linking: `leadsong://SearchDemo`

## Customization

### Adding to Other Screens

1. Import components:
```tsx
import { SearchBar, SearchBarHandle } from '../components/SearchBar';
import { dismissSearch } from '../utils/keyboard';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
```

2. Set up state and gesture:
```tsx
const searchBarRef = useRef<SearchBarHandle>(null);
const [isSearchFocused, setIsSearchFocused] = useState(false);

const swipeDownGesture = Gesture.Pan()
  .onUpdate((event) => {
    if (event.translationY > 12) {
      dismissSearch(searchBarRef);
    }
  })
  .minDistance(10)
  .activeOffsetY([10, 9999]);
```

3. Wrap with GestureDetector:
```tsx
<GestureDetector gesture={swipeDownGesture}>
  <View>
    <SearchBar
      ref={searchBarRef}
      onFocus={() => setIsSearchFocused(true)}
      onBlur={() => setIsSearchFocused(false)}
      {/* other props */}
    />
  </View>
</GestureDetector>
```

### Styling

The SearchBar component accepts a `containerStyle` prop:
```tsx
<SearchBar
  containerStyle={{
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    height: 50,
  }}
/>
```

## Troubleshooting

### Gesture Not Working
- Ensure `GestureHandlerRootView` wraps your app in `App.tsx`
- Check that `isSearchFocused` state is properly set on focus/blur
- Verify gesture thresholds aren't too strict

### Layout Jumps on Keyboard Dismiss
- Ensure `KeyboardAvoidingView` has correct `behavior` prop for platform
- Check that keyboard listeners are properly cleaning up
- Verify animated values are resetting correctly

### TypeScript Errors
- If seeing ref type errors, ensure you're using `SearchBarHandle` type
- The `dismissSearch` utility accepts `any` ref to avoid strict type issues

## Future Enhancements

- [ ] Add haptic feedback on successful swipe
- [ ] Customizable gesture thresholds via props
- [ ] Support for left/right swipe to clear
- [ ] Integration with React Navigation gesture system
- [ ] Animated visual feedback during swipe

## Files Modified/Created

**Created:**
- `src/components/SearchBar.tsx`
- `src/utils/keyboard.ts`
- `src/screens/SearchDemoScreen.tsx`
- `SEARCH-BAR-SWIPE-TO-DISMISS-IMPLEMENTATION.md`

**Modified:**
- `App.tsx` - Added GestureHandlerRootView
- `src/screens/MapScreen.tsx` - Integrated swipe-to-dismiss
- `src/navigation/index.tsx` - Added SearchDemo screen
- `package.json` - Added gesture-handler and reanimated dependencies

## Credits

Implementation follows React Native best practices for gesture handling and keyboard management, with inspiration from native iOS/Android search interactions.
