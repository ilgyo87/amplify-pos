import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreateCategoryButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}

export function CreateCategoryButton({
  onPress,
  disabled = false,
  style
}: CreateCategoryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="grid-outline" 
            size={24} 
            color={disabled ? '#999' : '#fff'} 
          />
        </View>
        <Text style={[
          styles.buttonText,
          disabled && styles.buttonTextDisabled
        ]}>
          Add Category
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Floating Action Button variant
export function CreateCategoryFAB({
  onPress,
  disabled = false,
  style
}: CreateCategoryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        disabled && styles.fabDisabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons 
        name="add" 
        size={28} 
        color={disabled ? '#999' : '#fff'} 
      />
    </TouchableOpacity>
  );
}

// Compact button variant for toolbars
export function CreateCategoryCompactButton({
  onPress,
  disabled = false,
  style
}: CreateCategoryButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.compactButton,
        disabled && styles.compactButtonDisabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons 
        name="add-circle" 
        size={20} 
        color={disabled ? '#999' : '#007AFF'} 
      />
      <Text style={[
        styles.compactButtonText,
        disabled && styles.compactButtonTextDisabled
      ]}>
        Category
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  compactButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  compactButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  compactButtonTextDisabled: {
    color: '#999',
  },
});