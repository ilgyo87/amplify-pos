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
import { syncService } from '../../database/services/syncService';

interface AddDefaultDataButtonProps {
  onDataAdded?: () => void;
  style?: any;
}

export function AddDefaultDataButton({
  onDataAdded,
  style
}: AddDefaultDataButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');

  const handleAddDefaultData = async () => {
    Alert.alert(
      'Add Default Data',
      'This will check for existing data in the cloud first, then add any missing default categories, products, and employees for a dry cleaning business.\n\nCategories to be added:\n• Dry Cleaning\n• Laundry\n• Alterations\n• Special Services\n\nEmployees to be added:\n• Manager Demo (PIN: 1234)\n• Employee Demo (PIN: 5678)\n• Test User (PIN: 0000)\n\nWould you like to:\n1. Sync from cloud first (recommended)\n2. Add locally only',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Add Locally Only',
          onPress: async () => {
            try {
              setLoading(true);
              setLoadingText('Adding default data...');
              await addDefaultData();
            } catch (error) {
              console.error('Error adding default data:', error);
              Alert.alert('Error', 'Failed to add default data. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        },
        {
          text: 'Sync & Add',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              setLoadingText('Syncing with cloud...');
              await syncAndAddDefaultData();
            } catch (error) {
              console.error('Error syncing and adding default data:', error);
              Alert.alert('Error', 'Failed to sync and add default data. Please try again.');
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
      
      // Get stats to show what was added
      const stats = await defaultDataService.getDataStatistics();
      
      Alert.alert(
        'Success!',
        `Default data has been processed.\n\nCurrent totals:\n• ${stats.categoriesCount} categories\n• ${stats.productsCount} products\n\nAny existing items were preserved to avoid duplicates.`,
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

  const syncAndAddDefaultData = async () => {
    try {
      console.log('[DEFAULT DATA] Starting sync before adding default data...');
      
      // First, try to sync from cloud
      setLoadingText('Syncing with cloud...');
      
      const syncResult = await syncService.syncAll();
      
      if (syncResult.conflicts && 
          (syncResult.conflicts.categories.length > 0 || 
           syncResult.conflicts.products.length > 0)) {
        // If there are conflicts, let the user know
        Alert.alert(
          'Sync Conflicts',
          `Found ${syncResult.conflicts.categories.length + syncResult.conflicts.products.length} conflicts between local and cloud data. Please resolve these conflicts in the Data Sync screen first.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // After sync, check current stats
      const beforeStats = await defaultDataService.getDataStatistics();
      
      // Now add any missing default data
      setLoadingText('Adding missing defaults...');
      console.log('[DEFAULT DATA] Adding missing default data after sync...');
      const result = await defaultDataService.initializeDefaultData();
      
      // Get stats after adding
      const afterStats = await defaultDataService.getDataStatistics();
      
      const categoriesAdded = afterStats.categoriesCount - beforeStats.categoriesCount;
      const productsAdded = afterStats.productsCount - beforeStats.productsCount;
      
      if (categoriesAdded === 0 && productsAdded === 0) {
        Alert.alert(
          'All Set!',
          'All default categories and products already exist (either locally or from the cloud). No new items were added.',
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
      } else {
        Alert.alert(
          'Success!',
          `Sync completed and missing defaults added:\n\n• ${categoriesAdded} new categories\n• ${productsAdded} new products\n\nTotal: ${afterStats.categoriesCount} categories, ${afterStats.productsCount} products`,
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
      }
    } catch (error) {
      console.error('Error in syncAndAddDefaultData:', error);
      // If sync fails, offer to add locally
      Alert.alert(
        'Sync Failed',
        'Could not sync with cloud. Would you like to add default data locally instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Locally',
            onPress: async () => {
              await addDefaultData();
            }
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingText}</Text>
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