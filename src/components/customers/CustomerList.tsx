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
import { CustomerDocument } from '../../database/schemas/customer';
import { formatPhoneNumber } from '../../utils/phoneUtils';

interface CustomerListProps {
  customers: CustomerDocument[];
  onEdit: (customer: CustomerDocument) => void;
  onDelete: (customer: CustomerDocument) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  showActions?: boolean;
}

interface CustomerItemProps {
  customer: CustomerDocument;
  onEdit: (customer: CustomerDocument) => void;
  onDelete: (customer: CustomerDocument) => void;
  showActions: boolean;
}

function CustomerItem({ 
  customer, 
  onEdit, 
  onDelete, 
  showActions 
}: CustomerItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(customer),
        },
      ]
    );
  };

  const formatAddress = () => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) parts.push(customer.state);
    if (customer.zipCode) parts.push(customer.zipCode);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const fullAddress = formatAddress();

  return (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => onEdit(customer)}
      activeOpacity={0.7}
    >
      <View style={styles.customerInfo}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>
            {customer.firstName} {customer.lastName}
          </Text>
          {customer.isLocalOnly && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          {customer.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color="#666" />
              <Text style={styles.contactText}>{customer.email}</Text>
            </View>
          )}
          
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.contactText}>
              {formatPhoneNumber(customer.phone)}
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

          {customer.notes && customer.notes.trim() && (
            <View style={styles.contactRow}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={[styles.contactText, styles.notesText]} numberOfLines={2}>
                {customer.notes}
              </Text>
            </View>
          )}
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onEdit(customer);
            }}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CustomerList({
  customers,
  onEdit,
  onDelete,
  loading = false,
  refreshing = false,
  onRefresh,
  emptyMessage = 'No customers found',
  showActions = true
}: CustomerListProps) {
  const renderCustomer = ({ item }: { item: CustomerDocument }) => (
    <CustomerItem
      customer={item}
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
        {customers.length === 0 
          ? 'Add your first customer to get started'
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

  if (loading && customers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={customers}
      renderItem={renderCustomer}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={customers.length === 0 ? styles.emptyListContainer : undefined}
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
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  customerItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
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
  notesText: {
    lineHeight: 18,
    fontStyle: 'italic',
    color: '#888',
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