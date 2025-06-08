import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Alert, Text, TouchableOpacity } from 'react-native';
import { BaseScreen } from '../BaseScreen';
import { useCustomers } from '../../database/hooks/useCustomers';
import { CustomerDocument } from '../../database/schemas/customer';
import { CustomerFormData } from '../../utils/customerValidation';

// Components
import { SearchBar } from '../../components/customers/SearchBar';
import { CustomerList } from '../../components/customers/CustomerList';
import { CreateCustomerFAB } from '../../components/customers/CreateCustomerButton';
import { DynamicForm } from '../../components/forms/DynamicForm';

export default function CustomersScreen() {
  const {
    customers,
    totalCustomers,
    loading,
    operationLoading,
    error,
    searchQuery,
    hasSearchResults,
    isSearching,
    searchCustomers,
    clearSearch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers,
    clearError
  } = useCustomers();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDocument | null>(null);

  // Form states
  const [formErrors, setFormErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState<string>('');

  const handleSearch = useCallback((query: string) => {
    searchCustomers(query);
  }, [searchCustomers]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleCreateCustomer = useCallback(async (data: CustomerFormData) => {
    setFormErrors({});
    setDuplicateError('');

    const result = await createCustomer(data);
    
    if (result.success && result.customer) {
      setShowCreateModal(false);
      Alert.alert('Success', 'Customer created successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [createCustomer]);

  const handleEditCustomer = useCallback((customer: CustomerDocument) => {
    setEditingCustomer(customer);
    setFormErrors({});
    setDuplicateError('');
    setShowEditModal(true);
  }, []);

  const handleUpdateCustomer = useCallback(async (data: CustomerFormData) => {
    if (!editingCustomer) return;

    setFormErrors({});
    setDuplicateError('');

    const result = await updateCustomer(editingCustomer.id, data);
    
    if (result.success && result.customer) {
      setShowEditModal(false);
      setEditingCustomer(null);
      Alert.alert('Success', 'Customer updated successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [editingCustomer, updateCustomer]);

  const handleDeleteCustomer = useCallback(async (customer: CustomerDocument) => {
    const success = await deleteCustomer(customer.id);
    if (success) {
      Alert.alert('Success', 'Customer deleted successfully');
    } else {
      Alert.alert('Error', 'Failed to delete customer');
    }
  }, [deleteCustomer]);

  const handleOpenCreateModal = useCallback(() => {
    setFormErrors({});
    setDuplicateError('');
    setShowCreateModal(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setFormErrors({});
    setDuplicateError('');
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCustomer(null);
    setFormErrors({});
    setDuplicateError('');
  }, []);

  const handleRefresh = useCallback(async () => {
    await refreshCustomers();
  }, [refreshCustomers]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  return (
    <BaseScreen title="Customers">
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
            resultsCount={customers.length}
            showResultsCount={hasSearchResults}
          />
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {hasSearchResults 
                ? `${customers.length} of ${totalCustomers} customers`
                : `${totalCustomers} total customers`
              }
            </Text>
          </View>
        </View>

        {/* Customer List */}
        <View style={styles.listContainer}>
          <CustomerList
            customers={customers}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            loading={loading}
            refreshing={false}
            onRefresh={handleRefresh}
            emptyMessage={
              hasSearchResults 
                ? 'No customers match your search'
                : 'No customers found'
            }
          />
        </View>

        {/* Create Customer FAB */}
        <CreateCustomerFAB
          onPress={handleOpenCreateModal}
          disabled={operationLoading}
        />

        {/* Create Customer Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="create"
            onSubmit={handleCreateCustomer}
            onCancel={handleCloseCreateModal}
            isLoading={operationLoading}
            errors={formErrors}
            duplicateError={duplicateError}
          />
        </Modal>

        {/* Edit Customer Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="edit"
            initialData={editingCustomer ? {
              firstName: editingCustomer.firstName,
              lastName: editingCustomer.lastName,
              email: editingCustomer.email || '',
              phone: editingCustomer.phone,
              address: editingCustomer.address || '',
              city: editingCustomer.city || '',
              state: editingCustomer.state || '',
              zipCode: editingCustomer.zipCode || ''
            } : undefined}
            onSubmit={handleUpdateCustomer}
            onCancel={handleCloseEditModal}
            isLoading={operationLoading}
            errors={formErrors}
            duplicateError={duplicateError}
          />
        </Modal>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  statsContainer: {
    paddingTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
});
