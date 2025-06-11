import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputBox } from '../ui/InputBox';
import { OrderService } from '../../database/services/orderService';
import { customerService } from '../../database/services/customerService';

interface PickupModalProps {
  visible: boolean;
  onClose: () => void;
  onOrderPickedUp?: (orderId: string) => void;
}

interface ReadyOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  createdAt: string;
  items: any[];
}

export function PickupModal({ visible, onClose, onOrderPickedUp }: PickupModalProps) {
  const [scanInput, setScanInput] = useState('');
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderService] = useState(() => new OrderService());

  // Fetch ready orders when modal opens
  useEffect(() => {
    if (visible) {
      fetchReadyOrders();
      setScanInput('');
    }
  }, [visible]);

  const fetchReadyOrders = async () => {
    try {
      setIsLoading(true);
      await orderService.initialize();
      await customerService.initialize();
      
      const orders = await orderService.getOrdersByStatus('completed');
      
      // Get customer names for each order
      const ordersWithCustomers = await Promise.all(
        orders.map(async (order) => {
          try {
            const customer = await customerService.getCustomerById(order.customerId);
            return {
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: customer ? `${customer.firstName} ${customer.lastName}` : order.customerName,
              customerPhone: customer ? customer.phone : order.customerPhone,
              total: order.total,
              createdAt: order.createdAt,
              items: order.items
            };
          } catch (error) {
            console.error('Error fetching customer for order:', error);
            return {
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              customerPhone: order.customerPhone || '',
              total: order.total,
              createdAt: order.createdAt,
              items: order.items
            };
          }
        })
      );
      
      // Sort by creation date, oldest first (FIFO)
      const sortedOrders = ordersWithCustomers.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setReadyOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching ready orders:', error);
      Alert.alert('Error', 'Failed to load ready orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanSubmit = async () => {
    if (!scanInput.trim()) return;

    setIsProcessing(true);
    try {
      // Find the order by order number
      const orderToPickup = readyOrders.find(
        order => order.orderNumber.toLowerCase() === scanInput.toLowerCase().trim()
      );

      if (!orderToPickup) {
        Alert.alert('Order Not Found', 'No completed order found with that number. Please check the order number and try again.');
        setScanInput('');
        setIsProcessing(false);
        return;
      }

      // Update order status to picked_up with status history tracking
      await orderService.updateOrderStatus(orderToPickup.id, 'picked_up');
      
      // Call callback if provided
      if (onOrderPickedUp) {
        onOrderPickedUp(orderToPickup.id);
      }

      // Remove from ready orders list
      setReadyOrders(prev => prev.filter(order => order.id !== orderToPickup.id));
      
      setScanInput('');
      
      Alert.alert(
        'Order Picked Up', 
        `Order #${orderToPickup.orderNumber} for ${orderToPickup.customerName} has been marked as picked up.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // If no more ready orders, close modal
              if (readyOrders.length <= 1) {
                onClose();
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error processing pickup:', error);
      Alert.alert('Error', 'Failed to process order pickup. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrderPress = (order: ReadyOrder) => {
    setScanInput(order.orderNumber);
  };

  const renderOrderItem = ({ item }: { item: ReadyOrder }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => handleOrderPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
        <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
      </View>
      
      <Text style={styles.customerName}>{item.customerName}</Text>
      {item.customerPhone && (
        <Text style={styles.customerPhone}>{item.customerPhone}</Text>
      )}
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderDate}>
          Completed: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.itemCount}>
          {item.items.reduce((sum, item) => sum + item.quantity, 0)} items
        </Text>
      </View>
      
      <View style={styles.tapHint}>
        <Ionicons name="hand-left" size={16} color="#007AFF" />
        <Text style={styles.tapHintText}>Tap to select</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="cube" size={24} color="#FF6B35" />
            <Text style={styles.title}>Ready for Pickup</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Scan Input Section */}
          <View style={styles.scanSection}>
            <Text style={styles.scanLabel}>Scan or Enter Completed Order Number</Text>
            <View style={styles.scanRow}>
              <View style={styles.scanInputContainer}>
                <InputBox
                  placeholder="Order number (e.g., 250611001)"
                  value={scanInput}
                  onChangeText={setScanInput}
                  onSubmitEditing={handleScanSubmit}
                  autoFocus={true}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={[styles.scanButton, isProcessing && styles.scanButtonDisabled]}
                onPress={handleScanSubmit}
                disabled={isProcessing || !scanInput.trim()}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Ready Orders List */}
          <View style={styles.ordersList}>
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersTitle}>
                Completed Orders ({readyOrders.length})
              </Text>
              <TouchableOpacity onPress={fetchReadyOrders} disabled={isLoading}>
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={isLoading ? "#ccc" : "#007AFF"} 
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading completed orders...</Text>
              </View>
            ) : readyOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>No completed orders for pickup</Text>
              </View>
            ) : (
              <FlatList
                data={readyOrders}
                keyExtractor={(item) => item.id}
                renderItem={renderOrderItem}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scanSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanInputContainer: {
    flex: 1,
    marginRight: 12,
  },
  scanButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#ccc',
  },
  ordersList: {
    flex: 1,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
  },
  itemCount: {
    fontSize: 12,
    color: '#888',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tapHintText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});