import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  FlatList, 
  Keyboard,
  Modal 
} from 'react-native';
import { Property } from '../lib/types';

interface PropertySearchProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  placeholder?: string;
}

export const PropertySearch: React.FC<PropertySearchProps> = ({
  properties,
  onPropertySelect,
  placeholder = "Search properties..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setFilteredProperties([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Filter properties by name or address
    const filtered = properties.filter(property => 
      property.name.toLowerCase().includes(query.toLowerCase()) ||
      property.address.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Limit to 10 results for performance

    setFilteredProperties(filtered);
  };

  const handlePropertySelect = (property: Property) => {
    setSearchQuery(property.name);
    setIsSearching(false);
    setFilteredProperties([]);
    Keyboard.dismiss();
    onPropertySelect(property);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProperties([]);
    setIsSearching(false);
    searchInputRef.current?.blur();
  };

  const getRatingDisplay = (property: Property): string => {
    if (!property.ratings) return '';
    
    const ratings = Object.values(property.ratings).filter(Boolean);
    if (ratings.length === 0) return '';
    
    const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return ` ★ ${avg.toFixed(1)}`;
  };

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <TouchableOpacity 
      style={styles.propertyItem}
      onPress={() => handlePropertySelect(item)}
    >
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {item.name}{getRatingDisplay(item)}
        </Text>
        <Text style={styles.propertyAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => searchQuery.length > 0 && setIsSearching(true)}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching && filteredProperties.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={filteredProperties}
            renderItem={renderPropertyItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {isSearching && searchQuery.length > 0 && filteredProperties.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No properties found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultsList: {
    paddingVertical: 8,
  },
  propertyItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
  },
});

export default PropertySearch;

