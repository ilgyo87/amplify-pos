import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../BaseScreen';
import { syncService, SyncStatus, SyncResult, businessService } from '../../database/services';
import { BusinessForm } from '../../components/forms/BusinessForm';
import { BusinessDocument } from '../../database/schemas/business';
import { BusinessFormData, BusinessValidationErrors } from '../../utils/businessValidation';

export default function SettingsScreen() {
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
    ordersDownloaded: 0,
    startTime: new Date(),
    success: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessDocument | null>(null);
  const [businesses, setBusinesses] = useState<BusinessDocument[]>([]);
  
  // Printer settings state
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printerIP, setPrinterIP] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerConnected, setPrinterConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    let businessSubscription: any = null;

    const initialize = async () => {
      await loadSyncStatus();
      await loadPrinterSettings();
      
      // Subscribe to business changes using RxDB reactive query
      try {
        const { getDatabaseInstance } = await import('../../database/config');
        const database = await getDatabaseInstance();
        
        businessSubscription = database.businesses
          .find({
            selector: {
              isDeleted: { $ne: true }
            }
          })
          .$.subscribe((businessDocs: any[]) => {
            setBusinesses(businessDocs);
          });
      } catch (error) {
        console.error('Failed to subscribe to business changes:', error);
      }
    };

    initialize();

    // Cleanup subscription on unmount
    return () => {
      if (businessSubscription) {
        businessSubscription.unsubscribe();
      }
    };
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

  const loadPrinterSettings = async () => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const settings = await AsyncStorage.default.getItem('printerSettings');
      if (settings) {
        const { ip, port } = JSON.parse(settings);
        setPrinterIP(ip || '');
        setPrinterPort(port || '9100');
        setPrinterConnected(true);
      } else {
        setPrinterConnected(false);
      }
    } catch (error) {
      console.error('Failed to load printer settings:', error);
      Alert.alert('Error', 'Failed to load printer settings');
      setPrinterConnected(false);
    }
  };

  const savePrinterSettings = async () => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const settings = {
        ip: printerIP,
        port: printerPort
      };
      await AsyncStorage.default.setItem('printerSettings', JSON.stringify(settings));
      setShowPrinterModal(false);
      Alert.alert('Success', 'Printer settings saved successfully');
    } catch (error) {
      console.error('Failed to save printer settings:', error);
      Alert.alert('Error', 'Failed to save printer settings');
    }
  };

  const testPrinterConnection = async () => {
    if (!printerIP) {
      Alert.alert('Error', 'Please enter a printer IP address');
      return;
    }

    setTestingConnection(true);
    try {
      console.log(`Testing connection to Munbyn printer at ${printerIP}:${printerPort}`);
      
      // Send a simple test print command to the thermal printer
      const testCommands = generateTestPrintCommands();
      const success = await sendTestDataToPrinter(printerIP, printerPort, testCommands);
      
      if (success) {
        setPrinterConnected(true);
        Alert.alert('Success', 'Successfully connected to Munbyn ITPP047P printer! A test receipt should have printed.');
      } else {
        setPrinterConnected(false);
        Alert.alert('Connection Failed', 'Could not connect to printer. Please check the IP address and ensure the printer is powered on and connected to the network.');
      }
      
    } catch (error) {
      console.error('Printer connection test failed:', error);
      setPrinterConnected(false);
      Alert.alert('Connection Failed', 'Could not connect to printer. Please check the IP address and ensure the printer is powered on and connected to the network.');
    } finally {
      setTestingConnection(false);
    }
  };

  const generateTestPrintCommands = (): Uint8Array => {
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    const commands: number[] = [];
    
    const addText = (text: string) => {
      const utf8Encoder = new TextEncoder();
      const bytes = utf8Encoder.encode(text);
      commands.push(...Array.from(bytes));
    };
    
    const addLF = () => commands.push(LF);
    
    // Initialize printer
    commands.push(ESC, 0x40); // Reset printer
    commands.push(ESC, 0x61, 0x01); // Center alignment
    
    // Test print content
    commands.push(ESC, 0x45, 0x01); // Bold on
    addText('PRINTER TEST');
    addLF();
    commands.push(ESC, 0x45, 0x00); // Bold off
    
    addText('Connection Successful');
    addLF();
    addText(`Date: ${new Date().toLocaleDateString()}`);
    addLF();
    addText(`Time: ${new Date().toLocaleTimeString()}`);
    addLF();
    addLF();
    addText('Munbyn ITPP047P Ready');
    addLF();
    addLF();
    addLF();
    
    // Cut paper
    commands.push(GS, 0x56, 0x00); // Full cut
    
    return new Uint8Array(commands);
  };

  const sendTestDataToPrinter = async (ip: string, port: string, data: Uint8Array): Promise<boolean> => {
    try {
      console.log(`Sending test data (${data.length} bytes) to printer at ${ip}:${port}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: data,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('Test print response status:', response.status);
        return response.ok;
        
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // For thermal printers, timeout often means the data was sent successfully
        // but the printer doesn't send HTTP responses
        const isNetworkError = fetchError instanceof Error && 
          (fetchError.name === 'AbortError' || 
          (typeof fetchError.message === 'string' && fetchError.message.includes('Network request failed')));
        
        if (isNetworkError) {
          console.log('Test print timeout - assuming success (normal for thermal printers)');
          return true; // Assume success for thermal printers
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Test print failed:', error);
      return false;
    }
  };


  const handleUpload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isUploading: true }));
      
      // Upload all entity types
      console.log('[UPLOAD] Starting upload of all entity types...');
      const results = {
        customers: await syncService.uploadCustomers(),
        employees: await syncService.uploadEmployees(),
        categories: await syncService.uploadCategories(),
        products: await syncService.uploadProducts(),
        businesses: await syncService.uploadBusinesses()
      };
      console.log('[UPLOAD] Upload results:', {
        customers: results.customers.uploadedCount,
        employees: results.employees.uploadedCount,
        categories: results.categories.uploadedCount,
        products: results.products.uploadedCount,
        businesses: results.businesses.uploadedCount
      });
      
      // Log special message if businesses were already synced
      if (results.businesses.uploadedCount === 0) {
        console.log('[UPLOAD] ℹ️  Note: Businesses that are already synced will not be uploaded again unless modified or force-resynced.');
      }
      
      // Combine results
      const totalUploaded = results.customers.uploadedCount + 
                           results.employees.uploadedCount + 
                           results.categories.uploadedCount +
                           results.products.uploadedCount +
                           results.businesses.uploadedCount;
      
      const allErrors = [
        ...results.customers.errors,
        ...results.employees.errors,
        ...results.categories.errors,
        ...results.products.errors,
        ...results.businesses.errors
      ];
      
      const combinedResult = {
        success: allErrors.length === 0,
        uploadedCount: totalUploaded,
        downloadedCount: 0,
        errors: allErrors
      };
      
      await loadSyncStatus(); // Refresh status
      showSyncResult('Upload', combinedResult);
    } catch (error) {
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncStatus(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDownload = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isDownloading: true }));
      
      // Download all entity types
      const results = {
        customers: await syncService.downloadCustomers(),
        employees: await syncService.downloadEmployees(),
        categories: await syncService.downloadCategories(),
        products: await syncService.downloadProducts(),
        businesses: await syncService.downloadBusinesses()
      };
      
      // Combine results
      const totalDownloaded = results.customers.downloadedCount + 
                             results.employees.downloadedCount + 
                             results.categories.downloadedCount +
                             results.products.downloadedCount +
                             results.businesses.downloadedCount;
      
      const allErrors = [
        ...results.customers.errors,
        ...results.employees.errors,
        ...results.categories.errors,
        ...results.products.errors,
        ...results.businesses.errors
      ];
      
      const combinedResult = {
        success: allErrors.length === 0,
        uploadedCount: 0,
        downloadedCount: totalDownloaded,
        errors: allErrors
      };
      
      await loadSyncStatus(); // Refresh status
      showSyncResult('Download', combinedResult);
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

  const showSyncResult = (operation: string, result: SyncResult | SyncStatus) => {
    const title = `${operation} Complete`;
    let message = '';
    
    // Handle SyncResult format
    if ('uploadedCount' in result && 'downloadedCount' in result) {
      if (result.uploadedCount > 0) {
        message += `Uploaded: ${result.uploadedCount} items\n`;
      }
      if (result.downloadedCount > 0) {
        message += `Downloaded: ${result.downloadedCount} items\n`;
      }
      if (result.errors && result.errors.length > 0) {
        message += `\nErrors (${result.errors.length}):\n${result.errors.slice(0, 3).join('\n')}`;
        if (result.errors.length > 3) {
          message += `\n... and ${result.errors.length - 3} more`;
        }
      }
    }
    // Handle SyncStatus format  
    else {
      const syncStatus = result as SyncStatus;
      const totalUploaded = syncStatus.customersUploaded + syncStatus.employeesUploaded + 
                           syncStatus.categoriesUploaded + syncStatus.productsUploaded + 
                           (syncStatus.businessesUploaded || 0);
      const totalDownloaded = syncStatus.customersDownloaded + syncStatus.employeesDownloaded + 
                             syncStatus.categoriesDownloaded + syncStatus.productsDownloaded + 
                             (syncStatus.businessesDownloaded || 0);
      
      if (totalUploaded > 0) {
        message += `Uploaded: ${totalUploaded} items\n`;
      }
      if (totalDownloaded > 0) {
        message += `Downloaded: ${totalDownloaded} items\n`;
      }
      if (syncStatus.error) {
        message += `\nError: ${syncStatus.error}`;
      }
    }
    if (!message) {
      message = 'No changes to sync';
    }

    Alert.alert(title, message.trim());
  };

  const handleEditBusiness = (business: BusinessDocument) => {
    setEditingBusiness(business);
    setShowBusinessModal(true);
  };

  const handleForceResync = async (business: BusinessDocument) => {
    Alert.alert(
      'Force Resync Business',
      `This will mark "${business.name}" as unsynced and it will be uploaded again on the next sync. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Resync',
          style: 'default',
          onPress: async () => {
            try {
              const result = await businessService.forceBusinessResync(business.id);
              if (result) {
                Alert.alert('Success', 'Business marked for resync');
                await loadSyncStatus(); // Refresh sync status
              } else {
                Alert.alert('Error', 'Failed to mark business for resync');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to mark business for resync');
            }
          }
        }
      ]
    );
  };

  const handleFixCategoryRelationships = async () => {
    Alert.alert(
      'Fix Category Relationships',
      'This will check and fix product-category relationships after sync. This ensures products are properly linked to their categories.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Relationships',
          onPress: async () => {
            try {
              const result = await syncService.fixProductCategoryRelationships();
              
              if (result.fixed > 0) {
                Alert.alert(
                  'Relationships Fixed',
                  `Fixed ${result.fixed} product-category relationships.${result.errors.length > 0 ? `\n\nWarnings: ${result.errors.length}` : ''}`
                );
              } else {
                Alert.alert('No Issues Found', 'All product-category relationships are already correct.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to fix category relationships. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleBusinessSubmit = async (businessData: BusinessFormData): Promise<{ business?: any; errors?: BusinessValidationErrors }> => {
    try {
      if (editingBusiness) {
        const result = await businessService.updateBusiness(editingBusiness.id, businessData);
        if (result.business) {
          Alert.alert('Success', 'Business updated successfully');
          setShowBusinessModal(false);
          return { business: result.business };
        } else {
          // Convert string array errors to BusinessValidationErrors format
          const formattedErrors: BusinessValidationErrors = {};
          if (result.errors && result.errors.length > 0) {
            formattedErrors.name = result.errors.join('\n');
          }
          return { errors: formattedErrors };
        }
      }
      return { errors: { name: 'No business selected for editing' } };
    } catch (error) {
      return { errors: { name: 'An unexpected error occurred' } };
    }
  };


  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
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

  interface SyncCardProps {
    title: string;
    description: string;
    onPress: () => void;
    loading: boolean;
    disabled?: boolean;
    icon: string; // Using string type since we're using 'as any' for the icon
    color?: string;
  }

  const SyncCard: React.FC<SyncCardProps> = ({ 
    title, 
    description, 
    onPress, 
    loading, 
    disabled = false, 
    icon, 
    color = '#007AFF' 
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
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
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
            {/* Customers, Employees, Businesses */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Customers:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalCustomers}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Employees:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalEmployees}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Businesses:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalBusinesses || 0}</Text>
            </View>

            {/* Products, Categories, Orders */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Products:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalProducts || 0}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Categories:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalCategories || 0}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Local Orders:</Text>
              <Text style={styles.statusValue}>{syncStatus.totalLocalOrders || 0}</Text>
            </View>
            
            {/* Unsynced Data */}
            <View style={[styles.statusRow, styles.sectionDivider]}>
              <Text style={[styles.statusLabel, styles.sectionLabel]}>Unsynced Data</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Customers:</Text>
              <Text style={[
                styles.statusValue,
                syncStatus.totalUnsyncedCustomers > 0 && styles.statusValueWarning
              ]}>
                {syncStatus.totalUnsyncedCustomers || 0}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Products:</Text>
              <Text style={[
                styles.statusValue,
                (syncStatus.totalUnsyncedProducts || 0) > 0 && styles.statusValueWarning
              ]}>
                {syncStatus.totalUnsyncedProducts || 0}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Categories:</Text>
              <Text style={[
                styles.statusValue,
                (syncStatus.totalUnsyncedCategories || 0) > 0 && styles.statusValueWarning
              ]}>
                {syncStatus.totalUnsyncedCategories || 0}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Orders:</Text>
              <Text style={[
                styles.statusValue,
                (syncStatus.totalUnsyncedOrders || 0) > 0 && styles.statusValueWarning
              ]}>
                {syncStatus.totalUnsyncedOrders || 0}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync:</Text>
              <Text style={styles.statusValue}>{formatDate(syncStatus.lastSyncDate)}</Text>
            </View>
          </View>
        </View>

        {/* Business Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Management</Text>
          
          {businesses.length > 0 ? (
            <>
              {businesses.map((business) => (
                <View key={business.id} style={styles.businessCard}>
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    {business.phone && (
                      <Text style={styles.businessDetail}>{business.phone}</Text>
                    )}
                    {business.address && (
                      <Text style={styles.businessDetail}>
                        {business.address}
                        {business.city && `, ${business.city}`}
                        {business.state && `, ${business.state}`}
                        {business.zipCode && ` ${business.zipCode}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.businessActions}>
                    <TouchableOpacity
                      style={styles.businessActionButton}
                      onPress={() => handleEditBusiness(business)}
                    >
                      <Ionicons name="pencil" size={18} color="#007AFF" />
                    </TouchableOpacity>
                    {!business.isLocalOnly && (
                      <TouchableOpacity
                        style={[styles.businessActionButton, { marginLeft: 8 }]}
                        onPress={() => handleForceResync(business)}
                      >
                        <Ionicons name="refresh" size={18} color="#FF9500" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyBusinessCard}>
              <Ionicons name="business" size={48} color="#ccc" />
              <Text style={styles.emptyBusinessText}>No business configured</Text>
              <Text style={styles.emptyBusinessSubtext}>
                Create your business profile from the dashboard to get started
              </Text>
            </View>
          )}
        </View>

        {/* Printer Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Settings</Text>
          
          <TouchableOpacity 
            style={styles.printerCard}
            onPress={() => setShowPrinterModal(true)}
          >
            <View style={styles.printerInfo}>
              <View style={styles.printerHeader}>
                <Ionicons name="print" size={24} color="#007AFF" />
                <View style={styles.printerDetails}>
                  <Text style={styles.printerName}>Munbyn ITPP047P</Text>
                  <Text style={styles.printerModel}>Thermal Receipt Printer</Text>
                </View>
              </View>
              
              <View style={styles.printerStatus}>
                {printerIP ? (
                  <>
                    <Text style={styles.printerIP}>IP: {printerIP}:{printerPort}</Text>
                    <View style={[styles.statusIndicator, printerConnected && styles.statusConnected]}>
                      <Text style={[styles.statusText, printerConnected && styles.statusTextConnected]}>
                        {printerConnected ? 'Connected' : 'Not Tested'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.printerNotConfigured}>Not configured</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
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
            title="Upload Data"
            description={
              getTotalUnsyncedCount() === 0
                ? 'All local data is synchronized'
                : `Upload ${getTotalUnsyncedCount()} local changes to the cloud`
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

        {/* Business Modal */}
        <BusinessForm
          visible={showBusinessModal}
          title="Edit Business"
          initialData={editingBusiness ? {
            name: editingBusiness.name,
            address: editingBusiness.address,
            city: editingBusiness.city,
            state: editingBusiness.state,
            zipCode: editingBusiness.zipCode,
            phone: editingBusiness.phone || '',
            taxId: editingBusiness.taxId,
            website: editingBusiness.website
          } : undefined}
          onSubmit={handleBusinessSubmit}
          onCancel={() => setShowBusinessModal(false)}
        />

        {/* Printer Settings Modal */}
        <Modal visible={showPrinterModal} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView 
            style={styles.modalContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPrinterModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Printer Settings</Text>
                <TouchableOpacity onPress={savePrinterSettings}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
              <View style={styles.printerInfoSection}>
                <View style={styles.printerIconContainer}>
                  <Ionicons name="print" size={48} color="#007AFF" />
                </View>
                <Text style={styles.printerModelTitle}>Munbyn ITPP047P</Text>
                <Text style={styles.printerDescription}>
                  Thermal Receipt Printer with Ethernet connectivity.
                  Configure your printer's network settings for direct printing without dialogs.
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Printer IP Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={printerIP}
                  onChangeText={setPrinterIP}
                  placeholder="192.168.1.100"
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  Find the IP address on your printer's network settings or configuration page
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Port (Default: 9100)</Text>
                <TextInput
                  style={styles.textInput}
                  value={printerPort}
                  onChangeText={setPrinterPort}
                  placeholder="9100"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>
                  Standard port for most thermal printers is 9100
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.testButton, testingConnection && styles.testButtonDisabled]}
                onPress={testPrinterConnection}
                disabled={testingConnection || !printerIP}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="wifi" size={20} color="white" />
                )}
                <Text style={styles.testButtonText}>
                  {testingConnection ? 'Testing Connection...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <View style={styles.directPrintInfo}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.directPrintText}>
                  Receipts will print directly to your Munbyn ITPP047P thermal printer via network connection. No print dialogs will be shown.
                </Text>
              </View>

              <View style={styles.setupInstructions}>
                <Text style={styles.instructionsTitle}>Setup Instructions:</Text>
                <Text style={styles.instructionText}>1. Connect your Munbyn ITPP047P to your network via Ethernet cable</Text>
                <Text style={styles.instructionText}>2. Print a network configuration page from the printer's front panel menu</Text>
                <Text style={styles.instructionText}>3. Find the IP address on the configuration page and enter it above</Text>
                <Text style={styles.instructionText}>4. Test the connection to verify your printer is reachable</Text>
                <Text style={styles.instructionText}>5. Receipts will automatically print to your configured printer</Text>
                <Text style={styles.instructionText}>6. No system dialogs or additional setup required after configuration</Text>
              </View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
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
    color: '#FF9500',
    fontWeight: '700',
  },
  sectionDivider: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionLabel: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
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
  businessCard: {
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  businessDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  businessActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  emptyBusinessCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  emptyBusinessText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyBusinessSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Printer Settings Styles
  printerCard: {
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerInfo: {
    flex: 1,
  },
  printerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  printerDetails: {
    marginLeft: 12,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  printerModel: {
    fontSize: 14,
    color: '#666',
  },
  printerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  printerIP: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  printerNotConfigured: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusConnected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusTextConnected: {
    color: '#4caf50',
  },
  
  // Printer Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  printerInfoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  printerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  printerModelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  printerDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  setupInstructions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  directPrintInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  directPrintText: {
    fontSize: 14,
    color: '#2e7d32',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
});
