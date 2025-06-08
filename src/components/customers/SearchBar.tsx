import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  isLoading?: boolean;
  resultsCount?: number;
  showResultsCount?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search customers by name, email, or phone...',
  isLoading = false,
  resultsCount,
  showResultsCount = true
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
    onClear();
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused
      ]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isFocused ? '#007AFF' : '#666'} 
          style={styles.searchIcon} 
        />
        
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>⟳</Text>
          </View>
        )}

        {value.length > 0 && !isLoading && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showResultsCount && value.length > 0 && resultsCount !== undefined && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {resultsCount === 0 
              ? 'No customers found' 
              : `${resultsCount} customer${resultsCount === 1 ? '' : 's'} found`
            }
          </Text>
          
          {value.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 44,
  },
  searchContainerFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  loadingContainer: {
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 18,
    color: '#007AFF',
    transform: [{ rotate: '360deg' }],
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});