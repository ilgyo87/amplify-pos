import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmployeeDocument } from '../../database/schemas/employee';
import { formatPhoneNumber } from '../../utils/phoneUtils';

interface EmployeeListProps {
  employees: EmployeeDocument[];
  onEdit: (employee: EmployeeDocument) => void;
  onDelete: (employee: EmployeeDocument) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  showActions?: boolean;
}

interface EmployeeItemProps {
  employee: EmployeeDocument;
  onEdit: (employee: EmployeeDocument) => void;
  onDelete: (employee: EmployeeDocument) => void;
  showActions: boolean;
}

const EmployeeItem: React.FC<EmployeeItemProps> = ({ 
  employee, 
  onEdit, 
  onDelete, 
  showActions 
}) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(employee),
        },
      ]
    );
  };

  const formatAddress = () => {
    const parts = [];
    if (employee.address) parts.push(employee.address);
    if (employee.city) parts.push(employee.city);
    if (employee.state) parts.push(employee.state);
    if (employee.zipCode) parts.push(employee.zipCode);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const fullAddress = formatAddress();

  return (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <View style={styles.employeeHeader}>
          <Text style={styles.employeeName}>
            {employee.firstName} {employee.lastName}
          </Text>
          {employee.isLocalOnly && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}
          {employee.pin && (
            <View style={styles.pinBadge}>
              <Ionicons name="key-outline" size={12} color="#28a745" />
              <Text style={styles.pinBadgeText}>PIN</Text>
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          {employee.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color="#666" />
              <Text style={styles.contactText}>{employee.email}</Text>
            </View>
          )}
          
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.contactText}>
              {formatPhoneNumber(employee.phone)}
            </Text>
          </View>
          
          {fullAddress && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={[styles.contactText, styles.addressText]} numberOfLines={2}>
                {fullAddress}
              </Text>
            </View>
          )}
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(employee)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onEdit,
  onDelete,
  loading = false,
  refreshing = false,
  onRefresh,
  emptyMessage = 'No employees found',
  showActions = true
}) => {
  const renderEmployee = ({ item }: { item: EmployeeDocument }) => (
    <EmployeeItem
      employee={item}
      onEdit={onEdit}
      onDelete={onDelete}
      showActions={showActions}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
      <Text style={styles.emptySubtext}>
        {employees.length === 0 
          ? 'Add your first employee to get started'
          : 'Try adjusting your search criteria'
        }
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={employees}
      renderItem={renderEmployee}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={employees.length === 0 ? styles.emptyListContainer : undefined}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  employeeItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  localBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  localBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  pinBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pinBadgeText: {
    fontSize: 10,
    color: '#28a745',
    fontWeight: '500',
  },
  contactInfo: {
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  addressText: {
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
  },
  editButton: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  deleteButton: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});