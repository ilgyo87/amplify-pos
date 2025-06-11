import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SerializableCustomer } from '../../navigation/types';

interface CustomerHeaderProps {
  customer: SerializableCustomer;
  onEdit?: () => void;
  onDatePick?: () => void;
  selectedDate?: string;
  style?: any;
  customerOrders?: any[];
  onReadyOrdersPress?: () => void;
  hasReadyOrders?: boolean;
  blinkAnimation?: Animated.Value;
}

export function CustomerHeader({
  customer,
  onEdit,
  onDatePick,
  selectedDate,
  style,
  customerOrders = [],
  onReadyOrdersPress,
  hasReadyOrders = false,
  blinkAnimation
}: CustomerHeaderProps) {
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getCustomerAddress = (): string => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) parts.push(customer.state);
    if (customer.zipCode) parts.push(customer.zipCode);
    return parts.join(', ');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.status_pending;
      case 'in_progress':
        return styles.status_in_progress;
      case 'ready':
        return styles.status_ready;
      case 'completed':
        return styles.status_completed;
      case 'cancelled':
        return styles.status_cancelled;
      default:
        return styles.status_pending;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.customerInfo}
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
          </Text>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.name}>
            {customer.firstName} {customer.lastName}
          </Text>
          
          <View style={styles.contactRow}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.contactText}>
              {formatPhoneNumber(customer.phone)}
            </Text>
          </View>
          
          {customer.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={14} color="#666" />
              <Text style={styles.contactText}>{customer.email}</Text>
            </View>
          )}
          
          {getCustomerAddress() && (
            <View style={styles.contactRow}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.contactText}>{getCustomerAddress()}</Text>
            </View>
          )}
        </View>

        {/* Notes in the open space */}
        {customer.notes && customer.notes.trim() && (
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text" size={14} color="#888" />
              <Text style={styles.notesLabel}>Notes</Text>
            </View>
            <Text style={styles.notesText} numberOfLines={3}>
              {customer.notes}
            </Text>
          </View>
        )}

        {/* Recent Orders */}
        {customerOrders.length > 0 && (
          <View style={styles.ordersContainer}>
            <View style={styles.ordersHeader}>
              <Ionicons name="time" size={14} color="#888" />
              <Text style={styles.ordersLabel}>Recent Orders</Text>
            </View>
            {customerOrders.slice(0, 3).map((order) => (
              <View key={order.id} style={styles.orderRow}>
                <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                <View style={styles.orderDetails}>
                  <Text style={[styles.orderStatus, getStatusStyle(order.status)]}>
                    {order.status}
                  </Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
      
      {onDatePick && (
        <View style={styles.dateSection}>
          {/* Ready Orders Button - Left of Date Picker */}
          {hasReadyOrders && onReadyOrdersPress && blinkAnimation && (
            <TouchableOpacity 
              style={styles.readyOrdersButton}
              onPress={onReadyOrdersPress}
              activeOpacity={0.7}
            >
              <Animated.View style={[styles.readyOrdersIcon, { opacity: blinkAnimation }]}>
                <Ionicons name="cube" size={24} color="#FF6B35" />
                <Text style={styles.readyOrdersButtonText}>Ready</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
          
          <View style={styles.dateDisplay}>
            <Text style={styles.dateLabel}>
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Select Date'}
            </Text>
          </View>
          <TouchableOpacity style={styles.calendarButton} onPress={onDatePick}>
            <Ionicons name="calendar" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  notesContainer: {
    flex: 1,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e5e5',
    maxWidth: 200,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notesLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  ordersContainer: {
    flex: 1,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e5e5',
    maxWidth: 250,
  },
  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ordersLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderStatus: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  orderDate: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  status_pending: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  status_in_progress: {
    backgroundColor: '#D1ECF1',
    color: '#0C5460',
  },
  status_ready: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  status_completed: {
    backgroundColor: '#E2E3E5',
    color: '#383D41',
  },
  status_cancelled: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
  },
  selectedDateText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  dateDisplay: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
  },
  dateLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  calendarButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  readyOrdersButton: {
    backgroundColor: '#FFF4F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
    marginRight: 12,
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