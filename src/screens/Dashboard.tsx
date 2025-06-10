import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputBox } from '../components/ui/InputBox';
import { DashboardMenu, MenuItem } from '../components/ui/DashboardMenu';
import { BusinessForm } from '../components/forms/BusinessForm';
import { customerService } from '../database/services/customerService';
import { businessService } from '../database/services/businessService';
import { CustomerDocument } from '../database/schemas/customer';
import { BusinessDocument } from '../database/schemas/business';
import { BusinessFormData, BusinessValidationErrors } from '../utils/businessValidation';
import { useDebouncedCallback } from '../utils/hooks';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function Dashboard() {
  const [businessName, setBusinessName] = useState('No Business');
  const [currentBusiness, setCurrentBusiness] = useState<BusinessDocument | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  useEffect(() => {
    let businessSubscription: any = null;

    const initialize = async () => {
      try {
        await customerService.initialize();
        await businessService.initialize();
        
        // Subscribe to business changes using RxDB reactive query
        const { getDatabaseInstance } = await import('../database/config');
        const database = await getDatabaseInstance();
        
        businessSubscription = database.businesses
          .find({
            selector: {
              isDeleted: { $ne: true }
            }
          })
          .$.subscribe((businesses: any[]) => {
            if (businesses.length > 0) {
              const business = businesses[0];
              setCurrentBusiness(business);
              setBusinessName(business.name);
            } else {
              setCurrentBusiness(null);
              setBusinessName('No Business');
            }
          });
      } catch (error) {
        console.error('Failed to initialize services:', error);
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
  
  const searchCustomers = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await customerService.searchCustomers(term, 10);
      setCustomers(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    searchCustomers(text);
  };

  const handleSelectCustomer = (customer: CustomerDocument) => {
    setSearchTerm('');
    setShowResults(false);
    setCustomers([]);
    
    // Convert to serializable object for navigation
    const serializableCustomer = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      phone: customer.phone,
      email: customer.email,
      businessId: customer.businessId,
      cognitoId: customer.cognitoId,
      notes: customer.notes,
      joinDate: customer.joinDate,
      isLocalOnly: customer.isLocalOnly,
      isDeleted: customer.isDeleted,
      lastSyncedAt: customer.lastSyncedAt,
      amplifyId: customer.amplifyId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
    
    navigation.navigate('Checkout', { customer: serializableCustomer });
  };

  const handleCreateBusiness = async (data: BusinessFormData): Promise<{ business?: any; errors?: BusinessValidationErrors }> => {
    try {
      const result = await businessService.createBusiness(data);
      
      if (result.business) {
        setCurrentBusiness(result.business);
        setBusinessName(result.business.name);
        setShowBusinessForm(false);
        console.log('Business created successfully:', result.business.name);
        return { business: result.business };
      } else {
        // Convert string array errors to BusinessValidationErrors format
        const formattedErrors: BusinessValidationErrors = {};
        if (result.errors && result.errors.length > 0) {
          formattedErrors.name = result.errors.join('\n');
        } else if (result.duplicateError) {
          formattedErrors.name = result.duplicateError;
        }
        return { errors: formattedErrors };
      }
    } catch (error) {
      console.error('Error creating business:', error);
      return { errors: { name: 'Failed to create business' } };
    }
  };

  const handleCreateBusinessPress = () => {
    setShowBusinessForm(true);
  };
  
  const menuItems: MenuItem[] = [
    { id: '1', title: 'Customers', icon: 'people', href: 'Customers', color: '#4CAF50' },
    { id: '2', title: 'Products', icon: 'cube', href: 'Products', color: '#2196F3' },
    { id: '3', title: 'Orders', icon: 'document', href: 'Orders', color: '#FF9800' },
    { id: '4', title: 'Employees', icon: 'person', href: 'Employees', color: '#9C27B0' },
    { id: '5', title: 'Settings', icon: 'settings', href: 'Settings', color: '#607D8B' },
    { id: '6', title: 'Reports', icon: 'bar-chart', href: 'Reports', color: '#795548' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>{businessName}</Text>
          {businessName === 'No Business' && (
            <TouchableOpacity 
              style={styles.createBusinessButton}
              onPress={handleCreateBusinessPress}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <InputBox
            placeholder="Customer Search"
            value={searchTerm}
            onChangeText={handleSearchChange}
            onFocus={() => searchTerm.trim() && setShowResults(true)}
          />
          
          {showResults && (
            <View style={styles.resultsContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
              ) : customers.length > 0 ? (
                <FlatList
                  data={customers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.customerItem} 
                      onPress={() => handleSelectCustomer(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.customerItemContent}>
                        <Text style={styles.customerName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        {item.email && <Text style={styles.customerDetail}>{item.email}</Text>}
                        {item.phone && <Text style={styles.customerDetail}>{item.phone}</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.resultsList}
                  keyboardShouldPersistTaps="handled"
                />
              ) : searchTerm.trim() ? (
                <Text style={styles.noResultsText}>No customers found</Text>
              ) : null}
            </View>
          )}
        </View>

        <DashboardMenu menuItems={menuItems} />
      </View>

      <BusinessForm
        visible={showBusinessForm}
        onSubmit={handleCreateBusiness}
        onCancel={() => setShowBusinessForm(false)}
        title="Create Business"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createBusinessButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 10,
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  resultsList: {
    borderRadius: 8,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerItemContent: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 1,
  },
  loader: {
    padding: 16,
  },
  noResultsText: {
    padding: 16,
    textAlign: 'center',
    color: '#888',
  },
});
