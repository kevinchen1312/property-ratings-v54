import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';

export interface SearchBarHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  containerStyle?: ViewStyle;
  showClearButton?: boolean;
  onClear?: () => void;
}

/**
 * Reusable SearchBar component with exposed blur/focus methods.
 * Use via ref to programmatically dismiss keyboard:
 * 
 * const searchRef = useRef<SearchBarHandle>(null);
 * searchRef.current?.blur();
 */
export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      placeholder = 'Search...',
      onSubmitEditing,
      onFocus,
      onBlur,
      containerStyle,
      showClearButton = true,
      onClear,
      ...textInputProps
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
      clear: () => {
        onChangeText('');
        onClear?.();
      },
    }));

    const handleClear = () => {
      onChangeText('');
      onClear?.();
      inputRef.current?.focus();
    };

    return (
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          blurOnSubmit={true}
          autoCapitalize="none"
          autoCorrect={false}
          {...textInputProps}
        />
        
        {showClearButton && value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
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
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
});
