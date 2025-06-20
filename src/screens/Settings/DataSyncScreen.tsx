import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BaseScreen } from '../BaseScreen';
import { syncService, SyncStatus, SyncResult } from '../../database/services';

export default function DataSyncScreen() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isUploading: false,
    isDownloading: false,
    totalLocalCustomers: 0,
    totalUnsyncedCustomers: 0,
    totalLocalEmployees: 0,
    totalUnsyncedEmployees: 0,
    totalLocalBusinesses: 0,
    totalUnsyncedBusinesses: 0,
    totalLocalProducts: 0,
    totalUnsyncedProducts: 0,
    totalLocalCategories: 0,
    totalUnsyncedCategories: 0,
    totalLocalOrders: 0,
    totalUnsyncedOrders: 0,
    customersUploaded: 0,
    customersDownloaded: 0,
    employeesUploaded: 0,
    employeesDownloaded: 0,
    categoriesUploaded: 0,
    categoriesDownloaded: 0,
    productsUploaded: 0,
    productsDownloaded: 0,
    businessesUploaded: 0,
    businessesDownloaded: 0,
    ordersUploaded: 0,
    ordersDownloaded: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  // Refresh sync status when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadSyncStatus(true);
      
      // Set up interval to refresh every 30 seconds while screen is focused
      const interval = setInterval(() => {
        loadSyncStatus(true);
      }, 30000);
      
      // Clean up interval when screen loses focus
      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  const loadSyncStatus = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // If this is called after a sync operation, add a small delay
      // to ensure database writes are fully committed
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      
      // Only log if there are unsynced items
      const totalUnsynced = status.totalUnsyncedCustomers + 
        status.totalUnsyncedEmployees + 
        (status.totalUnsyncedBusinesses || 0) +
        (status.totalUnsyncedProducts || 0) +
        (status.totalUnsyncedCategories || 0) +
        (status.totalUnsyncedOrders || 0);
        
      if (totalUnsynced > 0) {
        console.log('[DATASYNC] Unsynced items:', getUnsyncedDetails());
      }

      // Force component to re-render by triggering state update
      if (forceRefresh) {
        // Add a small delay and then update the state again to ensure re-render
        setTimeout(() => {
          setSyncStatus(prevStatus => ({ ...prevStatus }));
        }, 50);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
      Alert.alert('Error', 'Failed to load sync status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getTotalUnsyncedCount = () => {
    return (
      syncStatus.totalUnsyncedCustomers + 
      syncStatus.totalUnsyncedEmployees + 
      (syncStatus.totalUnsyncedBusinesses || 0) +
      (syncStatus.totalUnsyncedProducts || 0) +
      (syncStatus.totalUnsyncedCategories || 0) +
      (syncStatus.totalUnsyncedOrders || 0)
    );
  };

  const getUnsyncedDetails = () => {
    const details: string[] = [];
    
    if (syncStatus.totalUnsyncedCustomers > 0) {
      details.push(`${syncStatus.totalUnsyncedCustomers} customer${syncStatus.totalUnsyncedCustomers > 1 ? 's' : ''}`);
    }
    if (syncStatus.totalUnsyncedEmployees > 0) {
      details.push(`${syncStatus.totalUnsyncedEmployees} employee${syncStatus.totalUnsyncedEmployees > 1 ? 's' : ''}`);
    }
    if (syncStatus.totalUnsyncedBusinesses > 0) {
      details.push(`${syncStatus.totalUnsyncedBusinesses} business${syncStatus.totalUnsyncedBusinesses > 1 ? 'es' : ''}`);
    }
    if (syncStatus.totalUnsyncedProducts > 0) {
      details.push(`${syncStatus.totalUnsyncedProducts} product${syncStatus.totalUnsyncedProducts > 1 ? 's' : ''}`);
    }
    if (syncStatus.totalUnsyncedCategories > 0) {
      details.push(`${syncStatus.totalUnsyncedCategories} categor${syncStatus.totalUnsyncedCategories > 1 ? 'ies' : 'y'}`);
    }
    if (syncStatus.totalUnsyncedOrders > 0) {
      details.push(`${syncStatus.totalUnsyncedOrders} order${syncStatus.totalUnsyncedOrders > 1 ? 's' : ''}`);
    }
    
    return details.join(', ');
  };

  const handleUpload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isUploading: true }));
      
      const results = {
        customers: await syncService.uploadCustomers(),
        employees: await syncService.uploadEmployees(),
        categories: await syncService.uploadCategories(),
        products: await syncService.uploadProducts(),
        businesses: await syncService.uploadBusinesses(),
        orders: await syncService.uploadOrders()
      };
      
      const totalUploaded = results.customers.uploadedCount + 
                           results.employees.uploadedCount + 
                           results.categories.uploadedCount +
                           results.products.uploadedCount +
                           results.businesses.uploadedCount +
                           results.orders.uploadedCount;
      
      const allErrors = [
        ...results.customers.errors,
        ...results.employees.errors,
        ...results.categories.errors,
        ...results.products.errors,
        ...results.businesses.errors,
        ...results.orders.errors
      ];
      
      const combinedResult: SyncResult = {
        success: allErrors.length === 0,
        stats: {
          total: totalUploaded,
          synced: totalUploaded,
          failed: allErrors.length,
          skipped: 0
        },
        errors: allErrors
      };
      
      await loadSyncStatus(true);
      showSyncResult('Upload', combinedResult, totalUploaded, 0);
    } catch (error) {
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncStatus(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDownload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isDownloading: true }));
      
      const results = {
        customers: await syncService.downloadCustomers(),
        employees: await syncService.downloadEmployees(),
        categories: await syncService.downloadCategories(),
        products: await syncService.downloadProducts(),
        businesses: await syncService.downloadBusinesses(),
        orders: await syncService.downloadOrders()
      };
      
      const totalDownloaded = results.customers.downloadedCount + 
                             results.employees.downloadedCount + 
                             results.categories.downloadedCount +
                             results.products.downloadedCount +
                             results.businesses.downloadedCount +
                             results.orders.downloadedCount;
      
      const allErrors = [
        ...results.customers.errors,
        ...results.employees.errors,
        ...results.categories.errors,
        ...results.products.errors,
        ...results.businesses.errors,
        ...results.orders.errors
      ];
      
      const combinedResult: SyncResult = {
        success: allErrors.length === 0,
        stats: {
          total: totalDownloaded,
          synced: totalDownloaded,
          failed: allErrors.length,
          skipped: 0
        },
        errors: allErrors
      };
      
      await loadSyncStatus(true);
      showSyncResult('Download', combinedResult, 0, totalDownloaded);
    } catch (error) {
      Alert.alert('Download Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  const handleFullSync = async () => {
    Alert.alert(
      'Full Sync',
      'This will upload all local changes to the cloud, then download any new changes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            try {
              setSyncStatus(prev => ({ ...prev, isUploading: true, isDownloading: true }));
              const fullResult = await syncService.fullSync();
              
              // Convert FullSyncResult to SyncResult for showSyncResult
              const syncResult: SyncResult = {
                success: fullResult.success,
                stats: {
                  total: fullResult.summary.totalSynced + fullResult.summary.totalFailed,
                  synced: fullResult.summary.totalSynced,
                  failed: fullResult.summary.totalFailed,
                  skipped: 0
                },
                errors: fullResult.summary.totalErrors
              };
              
              await loadSyncStatus(true);
              showSyncResult('Full Sync', syncResult, fullResult.summary.totalSynced, 0);
            } catch (error) {
              Alert.alert('Sync Error', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setSyncStatus(prev => ({ ...prev, isUploading: false, isDownloading: false }));
            }
          }
        }
      ]
    );
  };

  const handleFixCategoryRelationships = async () => {
    Alert.alert(
      'Fix Category Relationships',
      'This will check and fix product-category relationships after sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Relationships',
          onPress: async () => {
            try {
              const result = await syncService.fixProductCategoryRelationships();
              
              Alert.alert(
                result.success ? 'Success' : 'Error',
                result.message
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to fix category relationships. Please try again.');
            }
          }
        }
      ]
    );
  };

  const showSyncResult = (operation: string, result: SyncResult, uploadedCount: number = 0, downloadedCount: number = 0) => {
    const title = `${operation} Complete`;
    let message = '';
    
    if (uploadedCount > 0) {
      message += `Uploaded: ${uploadedCount} items\n`;
    }
    if (downloadedCount > 0) {
      message += `Downloaded: ${downloadedCount} items\n`;
    }
    if (result.errors && result.errors.length > 0) {
      message += `\nErrors (${result.errors.length}):\n${result.errors.slice(0, 3).join('\n')}`;
      if (result.errors.length > 3) {
        message += `\n... and ${result.errors.length - 3} more`;
      }
    }
    
    if (!message) {
      message = 'No changes to sync';
    }

    Alert.alert(title, message.trim());
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const SyncCard = ({ 
    title, 
    description, 
    onPress, 
    loading, 
    disabled = false, 
    icon, 
    color = '#007AFF' 
  }: {
    title: string;
    description: string;
    onPress: () => void;
    loading: boolean;
    disabled?: boolean;
    icon: string;
    color?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.syncCard,
        (loading || disabled) && styles.syncCardDisabled
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <View style={styles.syncCardHeader}>
        <View style={[styles.syncCardIcon, { backgroundColor: `${color}20` }]}>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name={icon as any} size={24} color={color} />
          )}
        </View>
        <View style={styles.syncCardContent}>
          <Text style={styles.syncCardTitle}>{title}</Text>
          <Text style={styles.syncCardDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <BaseScreen title="Data Sync">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading sync status...</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Data Sync">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cloud Synchronization</Text>
          <Text style={styles.headerSubtitle}>
            Keep your data synchronized across devices
          </Text>
        </View>

        {/* Sync Status Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalCustomers}</Text>
                <Text style={styles.statusLabel}>Customers</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalEmployees}</Text>
                <Text style={styles.statusLabel}>Employees</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalProducts || 0}</Text>
                <Text style={styles.statusLabel}>Products</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalCategories || 0}</Text>
                <Text style={styles.statusLabel}>Categories</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalOrders || 0}</Text>
                <Text style={styles.statusLabel}>Orders</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusNumber}>{syncStatus.totalLocalBusinesses || 0}</Text>
                <Text style={styles.statusLabel}>Businesses</Text>
              </View>
            </View>

            {isRefreshing && (
              <View style={styles.refreshingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.refreshingText}>Updating sync status...</Text>
              </View>
            )}

            {!isRefreshing && getTotalUnsyncedCount() > 0 && (
              <View style={styles.unsyncedWarning}>
                <Ionicons name="warning" size={20} color="#ff6b35" />
                <Text style={styles.unsyncedWarningText}>
                  {getUnsyncedDetails()} need to be synced
                </Text>
              </View>
            )}

            <View style={styles.lastSyncContainer}>
              <Text style={styles.lastSyncLabel}>Last Sync:</Text>
              <Text style={styles.lastSyncValue}>{formatDate(syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt) : undefined)}</Text>
            </View>
          </View>
        </View>

        {/* Sync Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Actions</Text>
          
          <SyncCard
            title="Full Sync"
            description="Upload local changes, then download remote changes"
            onPress={handleFullSync}
            loading={syncStatus.isUploading || syncStatus.isDownloading}
            icon="sync"
            color="#28a745"
          />
          
          <SyncCard
            title="Upload Data"
            description={
              getTotalUnsyncedCount() === 0
                ? 'All local data is synchronized'
                : `Upload ${getUnsyncedDetails()} to the cloud`
            }
            onPress={handleUpload}
            loading={syncStatus.isUploading}
            disabled={getTotalUnsyncedCount() === 0}
            icon="cloud-upload"
            color="#007AFF"
          />
          
          <SyncCard
            title="Download from Cloud"
            description="Download latest changes from the cloud"
            onPress={handleDownload}
            loading={syncStatus.isDownloading}
            icon="cloud-download"
            color="#6f42c1"
          />
          
          <SyncCard
            title="Fix Category Links"
            description="Fix product-category relationships after sync"
            onPress={handleFixCategoryRelationships}
            loading={false}
            icon="link"
            color="#fd7e14"
          />
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Data Sync</Text>
              <Text style={styles.infoText}>
                Sync keeps your customer, employee, product, and order data synchronized with the cloud. 
                Use "Full Sync" for the most reliable synchronization.
              </Text>
            </View>
          </View>
        </View>

        {/* Refresh Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadSyncStatus(false)}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  unsyncedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  unsyncedWarningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    marginLeft: 8,
  },
  lastSyncContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  lastSyncLabel: {
    fontSize: 14,
    color: '#666',
  },
  lastSyncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  syncCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  syncCardDisabled: {
    opacity: 0.6,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  syncCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  syncCardContent: {
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  syncCardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#f0f7ff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f3ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  refreshingText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '500',
    marginLeft: 8,
  },
});