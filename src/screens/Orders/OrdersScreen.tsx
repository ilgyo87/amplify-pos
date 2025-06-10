import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, Alert, ScrollView, FlatList, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useOrders } from '../../database/hooks/useOrders';
import { OrderDocument, OrderDocType } from '../../database/schemas/order';
import { BaseScreen } from '../BaseScreen';

export default function OrdersScreen() {
  const [selectedStatus, setSelectedStatus] = useState<OrderDocType['status'] | 'all'>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedOrder, setSelectedOrder] = useState<OrderDocument | null>(null);
  const { orders, loading, updateOrderStatus } = useOrders(selectedStatus === 'all' ? undefined : selectedStatus);

  const handleScanPress = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (granted) {
        setShowScanner(true);
      } else {
        Alert.alert('Camera Access', 'Camera permission is required to scan QR codes.');
      }
    } else {
      setShowScanner(true);
    }
  };

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    
    // Find order by QR data
    const scannedOrder = orders.find(order => order.barcodeData === data);
    
    if (scannedOrder) {
      setSelectedOrder(scannedOrder);
    } else {
      Alert.alert('Order Not Found', 'No order found with this QR code.');
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderDocType['status']) => {
    Alert.alert(
      'Update Order Status',
      `Change order status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, newStatus);
            } catch (error) {
              Alert.alert('Error', 'Failed to update order status');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: OrderDocType['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: OrderDocType['status']) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'build-outline';
      case 'ready': return 'checkmark-circle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  const StatusFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
      {(['all', 'pending', 'in_progress', 'ready', 'completed', 'cancelled'] as const).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            selectedStatus === status && styles.filterButtonActive
          ]}
          onPress={() => setSelectedStatus(status)}
        >
          <Text style={[
            styles.filterButtonText,
            selectedStatus === status && styles.filterButtonTextActive
          ]}>
            {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const OrderCard = ({ order }: { order: OrderDocument }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderNumberSection}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Ionicons name={getStatusIcon(order.status) as any} size={16} color="white" />
          <Text style={styles.statusText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.customerSection}>
        <Text style={styles.customerName}>{order.customerName}</Text>
        {order.customerPhone && (
          <Text style={styles.customerPhone}>{order.customerPhone}</Text>
        )}
      </View>

      <View style={styles.itemsSection}>
        <Text style={styles.itemsLabel}>Items ({order.items.length}):</Text>
        {order.items.slice(0, 2).map((item, index) => (
          <Text key={item.itemKey} style={styles.itemText}>
            {item.quantity}x {item.name}
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={styles.moreItemsText}>
            +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
        <View style={styles.actionButtons}>
          {order.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => handleStatusChange(order.id, 'in_progress')}
            >
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {order.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => handleStatusChange(order.id, 'ready')}
            >
              <Text style={styles.actionButtonText}>Ready</Text>
            </TouchableOpacity>
          )}
          {order.status === 'ready' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6b7280' }]}
              onPress={() => handleStatusChange(order.id, 'completed')}
            >
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <BaseScreen title="Orders">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        </SafeAreaView>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Orders">
      <SafeAreaView style={styles.container}>
        {/* Header with scan button */}
        <View style={styles.header}>
          <StatusFilter />
          <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
            <Ionicons name="qr-code" size={24} color="#007AFF" />
            <Text style={styles.scanButtonText}>Scan QR</Text>
          </TouchableOpacity>
        </View>
        
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyText}>
              {selectedStatus === 'all' 
                ? 'Orders will appear here once they are created.'
                : `No orders with status "${selectedStatus}".`
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <OrderCard order={item} />}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* QR Scanner Modal */}
        <Modal visible={showScanner} animationType="slide">
          <SafeAreaView style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Order QR Code</Text>
              <View style={styles.placeholder} />
            </View>
            
            <CameraView
              style={styles.scanner}
              facing="back"
              onBarcodeScanned={handleQRCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>
                Position the QR code within the frame
              </Text>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setSelectedOrder(null)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>Order Details</Text>
                <View style={styles.placeholder} />
              </View>
              
              <ScrollView style={styles.detailContent}>
                <View style={styles.orderDetailCard}>
                  <Text style={styles.orderDetailNumber}>#{selectedOrder.orderNumber}</Text>
                  <Text style={styles.orderDetailCustomer}>{selectedOrder.customerName}</Text>
                  <Text style={styles.orderDetailDate}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.orderDetailTotal}>${selectedOrder.total.toFixed(2)}</Text>
                  
                  <View style={styles.itemsList}>
                    <Text style={styles.itemsTitle}>Items:</Text>
                    {selectedOrder.items.map((item, index) => (
                      <Text key={index} style={styles.itemDetail}>
                        {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
      </SafeAreaView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterScrollView: {
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginLeft: 12,
  },
  scanButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
  },
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
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumberSection: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  customerSection: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Scanner Modal Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  scannerText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  
  // Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  orderDetailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderDetailNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  orderDetailCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  orderDetailDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderDetailTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 16,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  itemDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
});
