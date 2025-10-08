import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SearchBar, SearchBarHandle } from '../components/SearchBar';
import { dismissSearch } from '../utils/keyboard';

// Dummy data for demo
const DEMO_RESULTS = Array.from({ length: 50 }, (_, i) => ({
  id: `${i}`,
  title: `Result Item ${i + 1}`,
  subtitle: `Description for item ${i + 1}`,
}));

/**
 * SearchDemoScreen - Demonstrates swipe-to-dismiss functionality
 * 
 * Features:
 * 1. Drag-to-dismiss: Swipe down anywhere in the list (native keyboardDismissMode)
 * 2. Swipe-on-search-bar: Pan gesture directly on search bar area
 * 3. Tap-outside: Tap anywhere on screen to dismiss
 * 4. Submit/Clear: Standard keyboard actions
 */
export const SearchDemoScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<SearchBarHandle>(null);
  const isDismissing = useRef(false);

  // Filter results based on search query
  const filteredResults = searchQuery.trim().length > 0
    ? DEMO_RESULTS.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : DEMO_RESULTS;

  // Handle dismissal with debounce to prevent rapid firing
  const handleDismiss = () => {
    if (isDismissing.current) return;
    
    isDismissing.current = true;
    dismissSearch(searchRef);
    
    setTimeout(() => {
      isDismissing.current = false;
    }, 150);
  };

  // Pan gesture for swipe-down on search bar area
  // Adjust thresholds here for sensitivity:
  // - translationY: minimum downward movement (pixels)
  // - velocityY: minimum swipe speed (pixels/second)
  // - activeOffsetY: activation threshold [min, max]
  const swipeDownGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Trigger on downward swipe (either distance or velocity based)
      if (event.translationY > 12 || event.velocityY > 800) {
        if (!isDismissing.current && isFocused) {
          handleDismiss();
        }
      }
    })
    .minDistance(10) // Minimum distance to start recognizing
    .activeOffsetY([10, 9999]) // Only activate on downward swipe
    .failOffsetY(-10); // Fail on upward swipe

  const handleSubmit = () => {
    console.log('Search submitted:', searchQuery);
    handleDismiss();
  };

  const renderItem = ({ item }: { item: typeof DEMO_RESULTS[0] }) => (
    <Pressable style={styles.resultItem}>
      <Text style={styles.resultTitle}>{item.title}</Text>
      <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Tap outside to dismiss - wraps entire content */}
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>Search Demo</Text>
            <Text style={styles.subtitle}>
              Try: swipe down on list, swipe down on search bar, or tap outside
            </Text>
          </View>

          {/* Search bar with swipe-down gesture */}
          <GestureDetector gesture={swipeDownGesture}>
            <View style={styles.searchContainer}>
              <SearchBar
                ref={searchRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search results..."
                onSubmitEditing={handleSubmit}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                showClearButton
              />
            </View>
          </GestureDetector>

          {/* Results list with native drag-to-dismiss */}
          <FlatList
            data={filteredResults}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag" // Native drag-to-dismiss
            keyboardShouldPersistTaps="handled" // Allow taps on list items
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  wrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  resultItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
