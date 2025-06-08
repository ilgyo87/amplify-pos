import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Alert, Text } from 'react-native';
import { BaseScreen } from '../BaseScreen';
import { useEmployees } from '../../database/hooks/useEmployees';
import { EmployeeDocument } from '../../database/schemas/employee';
import { EmployeeFormData } from '../../utils/employeeValidation';

// Components
import { SearchBar } from '../../components/customers/SearchBar';
import { EmployeeList } from '../../components/employees/EmployeeList';
import { CreateEmployeeFAB } from '../../components/employees/CreateEmployeeButton';
import { DynamicForm } from '../../components/forms/DynamicForm';

export default function EmployeesScreen() {
  const {
    employees,
    totalEmployees,
    loading,
    operationLoading,
    error,
    searchQuery,
    hasSearchResults,
    isSearching,
    searchEmployees,
    clearSearch,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
    clearError
  } = useEmployees();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDocument | null>(null);

  // Form states
  const [formErrors, setFormErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState<string>('');

  const handleSearch = useCallback((query: string) => {
    searchEmployees(query);
  }, [searchEmployees]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleCreateEmployee = useCallback(async (data: EmployeeFormData) => {
    setFormErrors({});
    setDuplicateError('');

    const result = await createEmployee(data);
    
    if (result.success && result.employee) {
      setShowCreateModal(false);
      Alert.alert('Success', 'Employee created successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [createEmployee]);

  const handleEditEmployee = useCallback((employee: EmployeeDocument) => {
    setEditingEmployee(employee);
    setFormErrors({});
    setDuplicateError('');
    setShowEditModal(true);
  }, []);

  const handleUpdateEmployee = useCallback(async (data: EmployeeFormData) => {
    if (!editingEmployee) return;

    setFormErrors({});
    setDuplicateError('');

    const result = await updateEmployee(editingEmployee.id, data);
    
    if (result.success && result.employee) {
      setShowEditModal(false);
      setEditingEmployee(null);
      Alert.alert('Success', 'Employee updated successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [editingEmployee, updateEmployee]);

  const handleDeleteEmployee = useCallback(async (employee: EmployeeDocument) => {
    const success = await deleteEmployee(employee.id);
    if (success) {
      Alert.alert('Success', 'Employee deleted successfully');
    } else {
      Alert.alert('Error', 'Failed to delete employee');
    }
  }, [deleteEmployee]);

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
    setEditingEmployee(null);
    setFormErrors({});
    setDuplicateError('');
  }, []);

  const handleRefresh = useCallback(async () => {
    await refreshEmployees();
  }, [refreshEmployees]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  return (
    <BaseScreen title="Employees">
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
            resultsCount={employees.length}
            showResultsCount={hasSearchResults}
            placeholder="Search by name, email, phone, or PIN..."
          />
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {hasSearchResults 
                ? `${employees.length} of ${totalEmployees} employees`
                : `${totalEmployees} total employees`
              }
            </Text>
          </View>
        </View>

        {/* Employee List */}
        <View style={styles.listContainer}>
          <EmployeeList
            employees={employees}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
            loading={loading}
            refreshing={false}
            onRefresh={handleRefresh}
            emptyMessage={
              hasSearchResults 
                ? 'No employees match your search'
                : 'No employees found'
            }
          />
        </View>

        {/* Create Employee FAB */}
        <CreateEmployeeFAB
          onPress={handleOpenCreateModal}
          disabled={operationLoading}
        />

        {/* Create Employee Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="create"
            entityType="employee"
            onSubmit={handleCreateEmployee}
            onCancel={handleCloseCreateModal}
            isLoading={operationLoading}
            errors={formErrors}
            duplicateError={duplicateError}
          />
        </Modal>

        {/* Edit Employee Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="edit"
            entityType="employee"
            initialData={editingEmployee ? {
              firstName: editingEmployee.firstName,
              lastName: editingEmployee.lastName,
              phone: editingEmployee.phone,
              email: editingEmployee.email || '',
              pin: editingEmployee.pin,
              address: editingEmployee.address || '',
              city: editingEmployee.city || '',
              state: editingEmployee.state || '',
              zipCode: editingEmployee.zipCode || ''
            } : undefined}
            onSubmit={handleUpdateEmployee}
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