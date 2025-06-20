import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../BaseScreen';
import { syncService, SyncStatus } from '../../database/services';
import { syncEventEmitter } from '../../database/services/syncEventEmitter';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
// Test notification button removed during cleanup

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  badge?: string | number;
  onPress: () => void;
}

export default function SettingsScreen() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingStatus = useRef(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    loadSyncStatus();
    
    // Listen for sync complete events
    const unsubscribe = syncEventEmitter.onSyncComplete(() => {
      loadSyncStatus();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh sync status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSyncStatus();
    }, [])
  );

  const loadSyncStatus = async () => {
    // Prevent concurrent loads
    if (isLoadingStatus.current) return;
    
    try {
      isLoadingStatus.current = true;
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setIsLoading(false);
      isLoadingStatus.current = false;
    }
  };

  const getTotalUnsyncedCount = () => {
    if (!syncStatus) return 0;
    return (
      syncStatus.totalUnsyncedCustomers + 
      syncStatus.totalUnsyncedEmployees + 
      (syncStatus.totalUnsyncedBusinesses || 0) +
      (syncStatus.totalUnsyncedProducts || 0) +
      (syncStatus.totalUnsyncedCategories || 0) +
      (syncStatus.totalUnsyncedOrders || 0)
    );
  };

  const settingsOptions: SettingsOption[] = [
    {
      id: 'business',
      title: 'Business Profile',
      description: 'Company information and settings',
      icon: 'business',
      color: '#007AFF',
      onPress: () => navigation.navigate('BusinessSettings')
    },
    {
      id: 'payment',
      title: 'Payment Settings',
      description: 'Stripe configuration and payment methods',
      icon: 'card',
      color: '#28a745',
      onPress: () => navigation.navigate('PaymentSettings')
    },
    {
      id: 'printer',
      title: 'Printer Settings',
      description: 'Receipt printer configuration',
      icon: 'print',
      color: '#20c997',
      onPress: () => navigation.navigate('PrinterSettings')
    },
    {
      id: 'sync',
      title: 'Data Sync',
      description: 'Cloud synchronization and backup',
      icon: 'sync',
      color: '#dc3545',
      badge: getTotalUnsyncedCount() > 0 ? getTotalUnsyncedCount() : undefined,
      onPress: () => navigation.navigate('DataSync')
    }
  ];

  const renderSettingsOption = (option: SettingsOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.settingsCard}
      onPress={option.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsCardContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
          <Ionicons 
            name={option.icon as any} 
            size={24} 
            color={option.color} 
          />
        </View>
        
        <View style={styles.settingsTextContainer}>
          <Text style={styles.settingsTitle}>{option.title}</Text>
          <Text style={styles.settingsDescription}>{option.description}</Text>
        </View>

        <View style={styles.settingsTrailing}>
          {option.badge !== undefined && (
            <View style={[styles.badge, { backgroundColor: option.color }]}>
              <Text style={styles.badgeText}>{option.badge}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <BaseScreen title="Settings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure your POS system preferences
          </Text>
        </View>

        <View style={styles.settingsGrid}>
          {settingsOptions.map(renderSettingsOption)}
        </View>


        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadSyncStatus}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  settingsGrid: {
    paddingHorizontal: 16,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingsTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
});