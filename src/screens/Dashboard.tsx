import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputBox } from '../components/ui/InputBox';
import { DashboardMenu, MenuItem } from '../components/ui/DashboardMenu';
import { BusinessForm } from '../components/forms/BusinessForm';
import { customerService } from '../database/services/customerService';
import { businessService } from '../database/services/businessService';
import { OrderService } from '../database/services/orderService';
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
  const [orderService] = useState(() => new OrderService());
  const [hasReadyOrders, setHasReadyOrders] = useState(false);
  const [blinkAnimation] = useState(new Animated.Value(1));
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  useEffect(() => {
    let businessSubscription: any = null;
    let readyOrdersSubscription: any = null;

    const initialize = async () => {
      try {
        await customerService.initialize();
        await businessService.initialize();
        await orderService.initialize();
        
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

        // Subscribe to completed orders for notification
        readyOrdersSubscription = database.orders
          .find({
            selector: {
              status: 'completed',
              isDeleted: { $ne: true }
            }
          })
          .$.subscribe((completedOrders: any[]) => {
            setHasReadyOrders(completedOrders.length > 0);
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
      if (readyOrdersSubscription) {
        readyOrdersSubscription.unsubscribe();
      }
    };
  }, []);

  // Handle blinking animation for ready orders notification
  useEffect(() => {
    if (hasReadyOrders) {
      const blinkLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnimation, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
      blinkLoop.start();
      return () => blinkLoop.stop();
    } else {
      blinkAnimation.setValue(1);
    }
  }, [hasReadyOrders]);
  
  const searchCustomers = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      let results: CustomerDocument[] = [];
      
      // First, search for customers by name, phone, email
      const customerResults = await customerService.searchCustomers(term, 10);
      results = [...customerResults];
      
      // Also search for orders by order number
      try {
        const order = await orderService.getOrderByNumber(term);
        if (order) {
          // Get the customer for this order
          const orderCustomer = await customerService.getCustomerById(order.customerId);
          if (orderCustomer) {
            // Check if customer is not already in results
            const isAlreadyInResults = results.some(c => c.id === orderCustomer.id);
            if (!isAlreadyInResults) {
              // Add a marker to indicate this was found via order search
              (orderCustomer as any).fromOrderSearch = true;
              (orderCustomer as any).orderNumber = order.orderNumber;
              results.unshift(orderCustomer); // Add to beginning of list
            }
          }
        }
      } catch (orderError) {
        // Order search failed, but continue with customer results
        console.log('Order search failed:', orderError);
      }
      
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

  const handleSelectCustomer = (customer: CustomerDocument & { fromOrderSearch?: boolean }) => {
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
    
    // If the customer was found via order search, automatically go to checkout
    // Otherwise, also navigate to checkout as that's where customer details are shown
    navigation.navigate('Checkout', { 
      customer: serializableCustomer 
    });
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
        <Text style={styles.businessName}>{businessName}</Text>
        {businessName === 'No Business' ? (
          <TouchableOpacity style={styles.createButton} onPress={handleCreateBusinessPress}>
            <Text style={styles.createButtonText}>Create Business</Text>
          </TouchableOpacity>
        ) : (
          hasReadyOrders && (
            <TouchableOpacity
              style={styles.readyOrdersButton}
              onPress={() => navigation.navigate('Orders')}
            >
              <Animated.View style={[styles.readyOrdersIcon, { opacity: blinkAnimation }]}>
                <Ionicons name="cube" size={24} color="#FF6B35" />
                <Text style={styles.readyOrdersButtonText}>Ready Orders</Text>
              </Animated.View>
            </TouchableOpacity>
          )
        )}
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <InputBox
          placeholder="Search customers by name, phone, email, or order number..."
          value={searchTerm}
          onChangeText={handleSearchChange}
          onFocus={() => searchTerm.trim() && setShowResults(true)}
          style={styles.searchInput}
        />
      </View>
      
      {showResults && (
        <View style={styles.searchResults}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : customers.length > 0 ? (
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.customerItem}
                  onPress={() => handleSelectCustomer(item)}
                >
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerInitials}>
                      {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    {(item as any).fromOrderSearch && (
                      <View style={styles.orderBadge}>
                        <Ionicons name="receipt-outline" size={12} color="#007AFF" />
                        <Text style={styles.orderBadgeText}>Order #{(item as any).orderNumber}</Text>
                      </View>
                    )}
                    <Text style={styles.customerName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.customerDetails}>
                      {item.phone} {item.email && `• ${item.email}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              )}
              style={styles.customerList}
              keyboardShouldPersistTaps="handled"
            />
          ) : searchTerm.trim() ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No customers found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          ) : null}
        </View>
      )}
      
      <View style={styles.content}>
        <DashboardMenu
          menuItems={menuItems}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  searchResults: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 300,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  customerList: {
    maxHeight: 280,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInitials: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  customerInfo: {
    flex: 1,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  readyOrdersButton: {
    backgroundColor: '#FFF4F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  readyOrdersIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyOrdersButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 6,
  },
});
