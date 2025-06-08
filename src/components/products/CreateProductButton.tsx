import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreateProductButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}

export const CreateProductButton: React.FC<CreateProductButtonProps> = ({
  onPress,
  disabled = false,
  style
}) => {
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
            name="cube-outline" 
            size={24} 
            color={disabled ? '#999' : '#fff'} 
          />
        </View>
        <Text style={[
          styles.buttonText,
          disabled && styles.buttonTextDisabled
        ]}>
          Add Product
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Floating Action Button variant
export const CreateProductFAB: React.FC<CreateProductButtonProps> = ({
  onPress,
  disabled = false,
  style
}) => {
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
};

// Compact button variant for toolbars
export const CreateProductCompactButton: React.FC<CreateProductButtonProps> = ({
  onPress,
  disabled = false,
  style
}) => {
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
        Product
      </Text>
    </TouchableOpacity>
  );
};

// Icon-only button variant
export const CreateProductIconButton: React.FC<CreateProductButtonProps> = ({
  onPress,
  disabled = false,
  style
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        disabled && styles.iconButtonDisabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons 
        name="add" 
        size={24} 
        color={disabled ? '#999' : '#007AFF'} 
      />
    </TouchableOpacity>
  );
};

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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  iconButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
});