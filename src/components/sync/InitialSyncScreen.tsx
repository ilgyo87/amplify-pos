import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from '../../database/services';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getDatabaseInstance } from '../../database';
import { checkAndClearUserData } from '../../utils/userDataManager';

export const InitialSyncScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [syncStatus, setSyncStatus] = useState('Checking for cloud data...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    performInitialSync();
  }, []);

  const performInitialSync = async () => {
    try {
      // Check if the user has changed and clear data if necessary
      const dataWasCleared = await checkAndClearUserData();
      
      if (dataWasCleared) {
        console.log('[InitialSync] User data was cleared due to user change');
        // Force a fresh sync after clearing data
        setSyncStatus('Setting up your fresh workspace...');
        setProgress(10);
      }
      
      // Check if we need to sync (either first launch or no local data)
      const needsSync = await checkIfSyncNeeded();
      
      if (!needsSync) {
        // Already has data, go directly to dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
        return;
      }

      // Perform initial sync
      setSyncStatus('Syncing data from cloud...');
      setProgress(20);
      
      const syncResult = await syncService.syncAll();
      
      setProgress(80);
      setSyncStatus('Finalizing...');
      
      // Mark that we've attempted a sync for this session
      await markInitialSyncComplete();
      
      if (syncResult.success) {
        const totalSynced = syncResult.summary.totalSynced;
        if (totalSynced > 0) {
          setSyncStatus(`Synced ${totalSynced} items from cloud!`);
        } else {
          setSyncStatus('Ready to go!');
        }
        setProgress(100);
        
        // Wait a moment to show the success message
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        }, 1500);
      } else {
        // If sync failed, still proceed but inform the user
        Alert.alert(
          'Sync Notice',
          'Could not sync with cloud. You can still use the app and sync later.',
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Initial sync error:', error);
      Alert.alert(
        'Setup Notice',
        'Could not complete initial setup. You can still use the app and sync later.',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            },
          },
        ]
      );
    }
  };

  const checkIfSyncNeeded = async (): Promise<boolean> => {
    try {
      // First, check if we have any local data
      const db = await getDatabaseInstance();
      if (!db) return true; // If no DB, definitely need to sync

      // Check if we have any data locally
      const [products, categories, customers, orders] = await Promise.all([
        db.products.find().limit(1).exec(),
        db.categories.find().limit(1).exec(),
        db.customers.find().limit(1).exec(),
        db.orders.find().limit(1).exec(),
      ]);

      // If we have no data at all, we need to sync
      const hasNoData = products.length === 0 && 
                       categories.length === 0 && 
                       customers.length === 0 && 
                       orders.length === 0;

      if (hasNoData) {
        // Clear the sync flag if we have no data
        await AsyncStorage.removeItem('@initial_sync_complete');
        return true;
      }

      // Check if this session has already attempted a sync
      const hasPerformedInitialSync = await AsyncStorage.getItem('@initial_sync_complete');
      if (hasPerformedInitialSync === 'true') {
        return false;
      }

      return false; // Has data and hasn't synced this session
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true; // On error, attempt sync to be safe
    }
  };

  const markInitialSyncComplete = async () => {
    try {
      await AsyncStorage.setItem('@initial_sync_complete', 'true');
    } catch (error) {
      console.error('Failed to mark initial sync complete:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🧺</Text>
        </View>
        
        <Text style={styles.title}>Setting up your account</Text>
        <Text style={styles.subtitle}>{syncStatus}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 72,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  progressContainer: {
    width: 250,
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  spinner: {
    marginTop: 16,
  },
});