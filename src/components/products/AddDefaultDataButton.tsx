import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { defaultDataService } from '../../database/services/defaultDataService';

interface AddDefaultDataButtonProps {
  onDataAdded?: () => void;
  style?: any;
}

export function AddDefaultDataButton({
  onDataAdded,
  style
}: AddDefaultDataButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAddDefaultData = async () => {
    Alert.alert(
      'Add Default Data',
      'This will add default categories, products, and employees for a dry cleaning business. This is helpful for getting started quickly.\n\nCategories to be added:\n• Dry Cleaning\n• Laundry\n• Alterations\n• Special Services\n\nEmployees to be added:\n• Manager Demo (PIN: 1234)\n• Employee Demo (PIN: 5678)\n• Test User (PIN: 0000)\n\nEach category will include typical service products with pricing.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Add Default Data',
          onPress: async () => {
            try {
              setLoading(true);

              await addDefaultData();
            } catch (error) {
              console.error('Error adding default data:', error);
              Alert.alert('Error', 'Failed to add default data. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const addDefaultData = async () => {
    try {
      console.log('[DEFAULT DATA] Starting default data creation...');
      const result = await defaultDataService.initializeDefaultData();
      
      console.log('[DEFAULT DATA] Result:', result);
      
      Alert.alert(
        'Success!',
        'Default categories and products have been added successfully. You can now start processing orders for dry cleaning, laundry, alterations, and special services.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onDataAdded) {
                onDataAdded();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in addDefaultData:', error);
      Alert.alert('Error', 'Failed to add default data. Please check the logs for details.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Adding default data...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleAddDefaultData}
      activeOpacity={0.7}
    >
      <Ionicons name="add-circle" size={20} color="#007AFF" />
      <Text style={styles.buttonText}>Add Default Data</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});