import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatus } from '../../types/order';
import { OrderDocument } from '../../database/schemas/order';

interface OrderListItemProps {
  order: OrderDocument;
  onPress: (order: OrderDocument) => void;
  showCustomerInfo?: boolean;
}

export function OrderListItem({ order, onPress, showCustomerInfo = true }: OrderListItemProps) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '#ff9500';
      case 'in_progress': return '#007AFF';
      case 'ready': return '#34c759';
      case 'completed': return '#5856d6';
      case 'picked_up': return '#32d74b';
      case 'cancelled': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'reload-circle-outline';
      case 'ready': return 'checkmark-circle-outline';
      case 'completed': return 'checkmark-done-circle';
      case 'picked_up': return 'checkmark-done';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return 'card';
      case 'terminal': return 'card-outline';
      case 'cash': return 'cash';
      case 'check': return 'document-text';
      case 'account': return 'person';
      default: return 'help-circle';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const statusColor = getStatusColor(order.status);

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={getStatusIcon(order.status) as any} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
      </View>

      {showCustomerInfo && (order.customerName || order.customerPhone) && (
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.customerText}>
            {order.customerName || 'No name'} • {order.customerPhone || 'No phone'}
          </Text>
        </View>
      )}

      <View style={styles.orderDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{formatDate(order.createdAt)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name={getPaymentMethodIcon(order.paymentMethod) as any} size={14} color="#666" />
          <Text style={styles.detailText}>{order.paymentMethod}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
          </Text>
        </View>
      </View>

      {order.refundAmount && (
        <View style={styles.refundInfo}>
          <Ionicons name="arrow-undo" size={14} color="#ff3b30" />
          <Text style={styles.refundText}>
            Refunded: ${order.refundAmount.toFixed(2)}
            {order.cancellationReason && ` - ${order.cancellationReason}`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  customerText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  orderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  refundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  refundText: {
    fontSize: 13,
    color: '#ff3b30',
    flex: 1,
  },
});