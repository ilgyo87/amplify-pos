import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { BaseScreen } from '../BaseScreen';
import { useCustomers } from '../../database/hooks/useCustomers';
import { CustomerDocument } from '../../database';

export default function CustomersScreen() {
  const { customers, loading, error, createCustomer, deleteCustomer } = useCustomers();
  const [refreshing, setRefreshing] = useState(false);

  const handleAddCustomer = async () => {
    try {
      await createCustomer({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      });
      Alert.alert('Success', 'Customer added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  const handleDeleteCustomer = async (customer: CustomerDocument) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customer.id);
              Alert.alert('Success', 'Customer deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer');
            }
          }
        }
      ]
    );
  };

  const renderCustomer = ({ item }: { item: CustomerDocument }) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onLongPress={() => handleDeleteCustomer(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.customerDetails}>{item.phone}</Text>
        <Text style={styles.customerDetails}>{item.email}</Text>
        {item.isLocalOnly && (
          <Text style={styles.localOnly}>Local Only</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <BaseScreen title="Customers">
        <View style={styles.centered}>
          <Text>Loading customers...</Text>
        </View>
      </BaseScreen>
    );
  }

  if (error) {
    return (
      <BaseScreen title="Customers">
        <View style={styles.centered}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Customers">
      <View style={styles.container}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCustomer}>
          <Text style={styles.addButtonText}>Add Test Customer</Text>
        </TouchableOpacity>
        
        <Text style={styles.countText}>
          Total Customers: {customers.length}
        </Text>

        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 1000);
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text>No customers found</Text>
              <Text>Tap "Add Test Customer" to get started</Text>
            </View>
          }
        />
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  customerItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  localOnly: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: 'bold',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
});
