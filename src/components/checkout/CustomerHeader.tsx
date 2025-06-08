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
  style?: any;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customer,
  onEdit,
  style
}) => {
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
      <View style={styles.customerInfo}>
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
      </View>
      
      {onEdit && (
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});