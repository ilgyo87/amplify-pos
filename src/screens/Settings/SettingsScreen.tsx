import React, { useState, useEffect } from 'react';
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
import { BaseScreen } from '../BaseScreen';
import { syncService, SyncStatus, SyncResult } from '../../database/services/syncService';

export default function SettingsScreen() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isUploading: false,
    isDownloading: false,
    totalLocalCustomers: 0,
    totalUnsyncedCustomers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      setIsLoading(true);
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
      Alert.alert('Error', 'Failed to load sync status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isUploading: true }));
      const result = await syncService.uploadCustomers();
      await loadSyncStatus(); // Refresh status
      showSyncResult('Upload', result);
    } catch (error) {
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncStatus(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDownload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isDownloading: true }));
      const result = await syncService.downloadCustomers();
      await loadSyncStatus(); // Refresh status
      showSyncResult('Download', result);
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
              const result = await syncService.fullSync();
              await loadSyncStatus(); // Refresh status
              showSyncResult('Full Sync', result);
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

  const showSyncResult = (operation: string, result: SyncResult) => {
    const title = `${operation} Complete`;
    let message = '';
    
    if (result.uploadedCount > 0) {
      message += `Uploaded: ${result.uploadedCount} items\n`;
    }
    if (result.downloadedCount > 0) {
      message += `Downloaded: ${result.downloadedCount} items\n`;
    }
    if (result.errors.length > 0) {
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
    return date.toLocaleString();
  };

  const SyncCard = ({ 
    title, 
    description, 
    onPress, 
    loading, 
    disabled, 
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
        <View style={[styles.syncCardIcon, { backgroundColor: color + '20' }]}>
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
      <BaseScreen title="Settings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading sync status...</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Sync Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sync</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Customers:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalCustomers}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Employees:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalEmployees}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Unsynced Changes:</Text>
              <Text style={[
                styles.statusValue,
                (syncStatus.totalUnsyncedCustomers + syncStatus.totalUnsyncedEmployees) > 0 && styles.statusValueWarning
              ]}>
                {syncStatus.totalUnsyncedCustomers + syncStatus.totalUnsyncedEmployees}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync:</Text>
              <Text style={styles.statusValue}>{formatDate(syncStatus.lastSyncDate)}</Text>
            </View>
          </View>
        </View>

        {/* Sync Actions Section */}
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
            title="Upload to Cloud"
            description={`Upload ${syncStatus.totalUnsyncedCustomers + syncStatus.totalUnsyncedEmployees} local changes to the cloud`}
            onPress={handleUpload}
            loading={syncStatus.isUploading}
            disabled={(syncStatus.totalUnsyncedCustomers + syncStatus.totalUnsyncedEmployees) === 0}
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
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Sync keeps your local customer and employee data in sync with the cloud. 
              Use "Full Sync" for the most reliable synchronization.
            </Text>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadSyncStatus}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshButtonText}>Refresh Status</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusValueWarning: {
    color: '#e74c3c',
  },
  syncCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  syncCardDisabled: {
    opacity: 0.6,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  syncCardContent: {
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 16,
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
    backgroundColor: '#e3f2fd',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
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
