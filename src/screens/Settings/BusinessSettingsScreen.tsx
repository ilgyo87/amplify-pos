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
import { BusinessForm } from '../../components/forms/BusinessForm';
import { BusinessDocument } from '../../database/schemas/business';
import { BusinessFormData, BusinessValidationErrors } from '../../utils/businessValidation';
import { businessService } from '../../database/services';

export default function BusinessSettingsScreen() {
  const [businesses, setBusinesses] = useState<BusinessDocument[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let businessSubscription: any = null;

    const initialize = async () => {
      await loadBusinesses();
      
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

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      await businessService.initialize();
      const allBusinesses = await businessService.getAllBusinesses();
      setBusinesses(allBusinesses);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      Alert.alert('Error', 'Failed to load business information');
    } finally {
      setIsLoading(false);
    }
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
                await loadBusinesses();
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

  const handleBusinessSubmit = async (businessData: BusinessFormData): Promise<{ business?: any; errors?: BusinessValidationErrors }> => {
    try {
      if (editingBusiness) {
        const result = await businessService.updateBusiness(editingBusiness.id, businessData);
        if (result.business) {
          Alert.alert('Success', 'Business updated successfully');
          setShowBusinessModal(false);
          setEditingBusiness(null);
          return { business: result.business };
        } else {
          // Return the errors from the result
          if (result.errors) {
            return { errors: result.errors };
          } else {
            // Fallback error if no specific errors were provided
            return { errors: { name: 'Failed to update business' } };
          }
        }
      }
      return { errors: { name: 'No business selected for editing' } };
    } catch (error) {
      return { errors: { name: 'An unexpected error occurred' } };
    }
  };

  if (isLoading) {
    return (
      <BaseScreen title="Business Profile">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading business information...</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Business Profile">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Business Information</Text>
          <Text style={styles.headerSubtitle}>
            Manage your company profile and settings
          </Text>
        </View>

        {businesses.length > 0 ? (
          <View style={styles.section}>
            {businesses.map((business) => (
              <View key={business.id} style={styles.businessCard}>
                <View style={styles.businessHeader}>
                  <View style={styles.businessIconContainer}>
                    <Ionicons name="business" size={32} color="#007AFF" />
                  </View>
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.name}</Text>
                    <View style={styles.syncStatusContainer}>
                      <View style={[
                        styles.syncStatus,
                        business.isLocalOnly ? styles.syncStatusLocal : styles.syncStatusSynced
                      ]}>
                        <Text style={[
                          styles.syncStatusText,
                          business.isLocalOnly ? styles.syncStatusTextLocal : styles.syncStatusTextSynced
                        ]}>
                          {business.isLocalOnly ? 'Local Only' : 'Synced'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.businessDetails}>
                  {business.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color="#666" />
                      <Text style={styles.detailText}>{business.phone}</Text>
                    </View>
                  )}
                  
                  {business.address && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {business.address}
                        {business.city && `, ${business.city}`}
                        {business.state && `, ${business.state}`}
                        {business.zipCode && ` ${business.zipCode}`}
                      </Text>
                    </View>
                  )}

                  {business.website && (
                    <View style={styles.detailRow}>
                      <Ionicons name="globe" size={16} color="#666" />
                      <Text style={styles.detailText}>{business.website}</Text>
                    </View>
                  )}

                  {business.taxId && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text" size={16} color="#666" />
                      <Text style={styles.detailText}>Tax ID: {business.taxId}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.businessActions}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleEditBusiness(business)}
                  >
                    <Ionicons name="pencil" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Edit Business</Text>
                  </TouchableOpacity>

                  {!business.isLocalOnly && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleForceResync(business)}
                    >
                      <Ionicons name="refresh" size={20} color="#FF9500" />
                      <Text style={styles.secondaryButtonText}>Force Resync</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="business" size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No Business Profile</Text>
            <Text style={styles.emptySubtitle}>
              Create your business profile from the dashboard to get started with your POS system.
            </Text>
          </View>
        )}

        {/* Business Form Modal */}
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
          onCancel={() => {
            setShowBusinessModal(false);
            setEditingBusiness(null);
          }}
        />
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
    paddingHorizontal: 16,
  },
  businessCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  businessIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  syncStatusContainer: {
    flexDirection: 'row',
  },
  syncStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncStatusLocal: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  syncStatusSynced: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncStatusTextLocal: {
    color: '#856404',
  },
  syncStatusTextSynced: {
    color: '#155724',
  },
  businessDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  businessActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  secondaryButtonText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});