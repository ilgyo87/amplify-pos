import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SerializableCustomer } from '../../navigation/types';

interface CustomerHeaderProps {
  customer: SerializableCustomer;
  onEdit?: () => void;
  onDatePick?: () => void;
  selectedDate?: string;
  style?: any;
}

export function CustomerHeader({
  customer,
  onEdit,
  onDatePick,
  selectedDate,
  style
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
      </TouchableOpacity>
      
      {onDatePick && (
        <View style={styles.dateSection}>
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
});