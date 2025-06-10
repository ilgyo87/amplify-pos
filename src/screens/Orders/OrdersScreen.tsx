import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  FlatList, 
  Modal, 
  TextInput, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import { useOrders } from '../../database/hooks/useOrders';
import { OrderDocument, OrderDocType } from '../../database/schemas/order';
import { generateLabelHTML, printLabel } from '../../utils/printUtils';
import { QRCode } from '../../utils/qrUtils';

type OrderItem = OrderDocument['items'][0];

export default function OrdersScreen() {
  const [selectedStatus, setSelectedStatus] = useState<OrderDocType['status'] | 'all'>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedOrder, setSelectedOrder] = useState<OrderDocument | null>(null);
  const [scannedItemsState, setScannedItemsState] = useState<{[key: string]: boolean}>({});
  const [manualOrderInput, setManualOrderInput] = useState('');
  const [showItemScanner, setShowItemScanner] = useState(false);
  const [itemScanInput, setItemScanInput] = useState('');
  const [showRackScanner, setShowRackScanner] = useState(false);
  const [rackScanInput, setRackScanInput] = useState('');
  // Store QR refs for mass printing
  const qrRefs = useRef<{[key: string]: React.RefObject<View | null>}>({});
  const { orders, loading, updateOrderStatus } = useOrders(selectedStatus === 'all' ? undefined : selectedStatus);
  
  // Create a memoized lookup map for orders
  const orderLookupMap = useMemo(() => {
    const map = new Map<string, OrderDocument>();
    orders.forEach(order => {
      // Map by order number
      map.set(order.orderNumber.toString(), order);
      // Map by barcode if exists
      if (order.barcodeData) {
        map.set(order.barcodeData, order);
      }
    });
    return map;
  }, [orders]);

  const toggleItemScan = (itemKey: string) => {
    setScannedItemsState(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  // Derive scanned items state reactively
  const scannedItems = scannedItemsState;

  const allItemsScanned = selectedOrder 
    ? selectedOrder.items.every(item => {
        // Check if all individual items for this item are scanned
        for (let i = 0; i < item.quantity; i++) {
          const itemId = `${item.itemKey}-${i}`;
          if (!scannedItems[itemId]) {
            return false;
          }
        }
        return true;
      })
    : false;

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

  const onSelectOrder = (order: OrderDocument) => {
    setSelectedOrder(order);
    setScannedItemsState({});
  };

  const searchForOrder = (searchTerm: string) => {
    if (!searchTerm) return;
    
    // Try exact match with order number (now that QR code is just the order number)
    const foundOrder = orderLookupMap.get(searchTerm);
    
    if (foundOrder) {
      onSelectOrder(foundOrder);
      setManualOrderInput('');
      console.log('Order found and modal opening');
    } else {
      console.log('❌ No order found for:', searchTerm);
      Alert.alert('Order Not Found', `No order found matching "${searchTerm}"`);
      setManualOrderInput('');
    }
  };

  const handleManualOrderSearch = () => {
    searchForOrder(manualOrderInput.trim());
  };

  const handleInputChange = (text: string) => {
    setManualOrderInput(text);
    
    // Auto-search as soon as we detect an order number (YYMMDD### format - 9 digits)
    const orderNumberMatch = text.match(/\d{9}/);
    if (orderNumberMatch) {
      const orderNumber = orderNumberMatch[0];
      // Search immediately when order number is detected
      setTimeout(() => {
        console.log('Auto-searching for order number:', orderNumber);
        searchForOrder(orderNumber);
      }, 50);
    }
  };

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    
    // O(1) lookup using the map
    const scannedOrder = orderLookupMap.get(data);
    if (scannedOrder) {
      onSelectOrder(scannedOrder); // Use the shared onSelectOrder function
    } else {
      console.log('❌ No order found for QR code:', data);
      // No alert, scanner already closed
    }
  };

  const processItemScan = async (data: string) => {
    // Check if this is a valid item QR code (orderNumber-itemNumber format)
    if (selectedOrder && data.startsWith(selectedOrder.orderNumber + '-')) {
      const itemNumber = data.replace(selectedOrder.orderNumber + '-', '');
      const globalItemNumber = parseInt(itemNumber); // This is already the global item number
      const itemIndex = globalItemNumber - 1; // Convert to 0-based index
      
      if (!isNaN(itemIndex) && itemIndex >= 0) {
        // Find which item this belongs to
        let currentIndex = 0;
        for (const item of selectedOrder.items) {
          for (let i = 0; i < item.quantity; i++) {
            if (currentIndex === itemIndex) {
              const itemId = `${item.itemKey}-${i}`;
              
              // Check if this is the first item being scanned
              const isFirstItemScanned = Object.keys(scannedItemsState).length === 0;
              
              setScannedItemsState(prev => ({
                ...prev,
                [itemId]: true
              }));
              
              // If this is the first item scanned and order is still pending, change status to in_progress
              if (isFirstItemScanned && selectedOrder.status === 'pending') {
                try {
                  await updateOrderStatus(selectedOrder.id, 'in_progress');
                  console.log('Order status changed to in_progress');
                } catch (error) {
                  console.error('Failed to update order status:', error);
                }
              }
              
              Alert.alert('Item Scanned', `${item.name} #${globalItemNumber} has been scanned.`);
              
              // Check if all items are now scanned and auto-close for pending orders
              setTimeout(() => {
                checkAndAutoCloseIfAllScanned();
              }, 100); // Small delay to ensure state is updated
              
              return;
            }
            currentIndex++;
          }
        }
      }
      console.log('❌ Invalid item number:', itemNumber, 'for order:', selectedOrder.orderNumber);
      // Clear input without showing alert
    } else {
      console.log('❌ Invalid QR code:', data, 'does not belong to order:', selectedOrder?.orderNumber);
      // Clear input without showing alert
    }
    
    // Always clear the input field after scanning
    setItemScanInput('');
  };

  const checkAndAutoCloseIfAllScanned = () => {
    if (!selectedOrder) return;
    
    // Auto-close for both pending and in_progress orders (when they become ready)
    if (selectedOrder.status !== 'pending' && selectedOrder.status !== 'in_progress') return;
    
    // Check if all items are scanned
    const allScanned = selectedOrder.items.every(item => {
      for (let i = 0; i < item.quantity; i++) {
        const itemId = `${item.itemKey}-${i}`;
        if (!scannedItemsState[itemId]) {
          return false;
        }
      }
      return true;
    });
    
    if (allScanned) {
      console.log('🎉 All items scanned! Auto-closing modal and updating status to ready.');
      
      // Update order status to ready
      updateOrderStatus(selectedOrder.id, 'ready')
        .then(() => {
          // Close the modal
          setSelectedOrder(null);
          setScannedItemsState({}); // Clear scanned items state
          
          Alert.alert(
            'Order Complete', 
            `All items for Order #${selectedOrder.orderNumber} have been scanned and the order is now ready for pickup.`
          );
        })
        .catch((error) => {
          console.error('Failed to update order status to ready:', error);
          Alert.alert('Error', 'All items scanned but failed to update order status. Please try again.');
        });
    }
  };

  const handleItemQRScanned = ({ data }: { data: string }) => {
    setShowItemScanner(false);
    processItemScan(data);
  };

  const handleManualItemScan = () => {
    if (itemScanInput.trim()) {
      processItemScan(itemScanInput.trim());
      // processItemScan will clear the input
    }
  };

  const handleItemInputChange = (text: string) => {
    setItemScanInput(text);
    
    // Auto-scan when input matches the expected format (orderNumber-number)
    if (selectedOrder && text.match(new RegExp(`^${selectedOrder.orderNumber}-\\d+$`))) {
      setTimeout(() => {
        processItemScan(text);
        // processItemScan will clear the input
      }, 100);
    }
  };

  const processRackScan = async (rackNumber: string) => {
    if (!selectedOrder) return;
    
    if (selectedOrder.status === 'ready') {
      try {
        // Update order status to completed and save rack number
        await updateOrderStatus(selectedOrder.id, 'completed');
        
        // Here you might want to save the rack number to the order
        // This would require updating the order schema to include rackNumber
        console.log(`Order ${selectedOrder.orderNumber} moved to rack ${rackNumber} and marked as completed`);
        
        Alert.alert(
          'Order Completed', 
          `Order #${selectedOrder.orderNumber} has been moved to rack ${rackNumber} and marked as completed.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedOrder(null);
                setScannedItemsState({});
              }
            }
          ]
        );
      } catch (error) {
        console.error('Failed to update order status:', error);
        // Log error but don't show alert, just clear input
      }
    } else {
      console.log('❌ Invalid status for rack assignment:', selectedOrder.status, 'Expected: ready');
      // Log error but don't show alert, just clear input
    }
    
    // Always clear the rack input field after scanning
    setRackScanInput('');
  };

  const handleRackQRScanned = ({ data }: { data: string }) => {
    setShowRackScanner(false);
    processRackScan(data);
  };

  const handleManualRackScan = () => {
    if (rackScanInput.trim()) {
      processRackScan(rackScanInput.trim());
      // processRackScan will clear the input
    }
  };

  const handleRackInputChange = (text: string) => {
    setRackScanInput(text);
    
    // Auto-scan when input has content (rack numbers can be any format)
    if (text.trim().length >= 2) {
      setTimeout(() => {
        processRackScan(text.trim());
        // processRackScan will clear the input
      }, 100);
    }
  };

  const printItemLabel = async (item: OrderItem, globalItemNumber: number, qrRef?: React.RefObject<View | null> | null) => {
    try {
      if (!selectedOrder) return;
      
      const qrData = `${selectedOrder.orderNumber}-${globalItemNumber}`;
      
      let qrImageBase64 = qrData; // Default to QR data
      
      // Try to capture QR code if ref is available
      if (qrRef?.current) {
        try {
          console.log('Attempting to capture QR code...');
          // Add a small delay to ensure QR code is fully rendered
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const capturedBase64 = await captureRef(qrRef.current, {
            format: 'png',
            quality: 1,
            result: 'base64',
            width: 100,
            height: 100,
          });
          
          console.log('Captured QR code, base64 length:', capturedBase64.length);
          
          // Use captured image if it seems valid
          if (capturedBase64.length > 1000) {
            qrImageBase64 = capturedBase64;
            console.log('Using captured QR code');
          } else {
            console.log('Captured QR seems invalid, using generated SVG');
          }
        } catch (captureError) {
          console.warn('QR capture failed, using generated SVG:', captureError);
        }
      }
      
      console.log('🏷️ Generating label HTML...');
      const html = await generateLabelHTML({
        orderNumber: selectedOrder.orderNumber,
        customerName: selectedOrder.customerName,
        garmentType: `${item.name} #${globalItemNumber}`,
        notes: item.options?.notes || '',
        qrImageBase64: qrImageBase64
      });
      
      console.log('📋 Generated HTML, length:', html.length);
      console.log('🖨️ About to call printLabel...');
      
      const printResult = await printLabel(html);
      
      // Check if print was cancelled
      if (printResult === null) {
        console.log('ℹ️ Print cancelled by user');
        return; // Exit without showing any message
      }
      
      console.log('✅ printLabel completed with result:', printResult);
      Alert.alert('Label Printed', `Label for ${item.name} #${globalItemNumber} has been printed.`);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print label. Please try again.');
    }
  };

  // Individual Item Component
  const IndividualItemComponent = ({
    item,
    itemIndex,
    globalItemNumber,
    isScanned,
    qrData
  }: {
    item: OrderItem;
    itemIndex: number;
    globalItemNumber: number;
    isScanned: boolean;
    qrData: string;
  }) => {
    const qrRef = useRef<View>(null);
    
    // Store the ref for individual printing
    const itemId = `${item.itemKey}-${itemIndex}`;
    qrRefs.current[itemId] = qrRef;
    
    // For ready orders, don't show individual items (handled in parent)
    if (selectedOrder && selectedOrder.status === 'ready') {
      return null;
    }
    
    // Default view for other statuses (completed, cancelled)
    return (
      <View style={[styles.individualItem, isScanned && styles.scannedItem]}>
        <View style={styles.itemMainContent}>
          <View style={styles.itemCheckbox}>
            {isScanned && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </View>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name} #{globalItemNumber}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            {item.options?.starch && item.options.starch !== 'none' && (
              <Text style={styles.itemOptions}>Starch: {item.options.starch}</Text>
            )}
            {item.options?.pressOnly && (
              <Text style={styles.itemOptions}>Press Only</Text>
            )}
            {item.options?.notes && (
              <Text style={styles.itemOptions}>Notes: {item.options.notes}</Text>
            )}
          </View>
          <View ref={qrRef} style={styles.qrPreviewContainer} collapsable={false}>
            <QRCode
              value={qrData}
              size={40}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>
          <TouchableOpacity 
            style={styles.printButton}
            onPress={() => printItemLabel(item, globalItemNumber, qrRef)}
          >
            <Ionicons name="print" size={16} color="#007AFF" />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderItem = (item: OrderItem, globalItemStartIndex: number) => {
    // Create individual items for each quantity
    const individualItems = [];
    for (let i = 0; i < item.quantity; i++) {
      const itemId = `${item.itemKey}-${i}`;
      const isScanned = scannedItems[itemId] || false;
      const globalItemNumber = globalItemStartIndex + i + 1; // Global sequential numbering
      const qrData = selectedOrder ? `${selectedOrder.orderNumber}-${globalItemNumber}` : '';
      
      individualItems.push(
        <IndividualItemComponent
          key={itemId}
          item={item}
          itemIndex={i}
          globalItemNumber={globalItemNumber}
          isScanned={isScanned}
          qrData={qrData}
        />
      );
    }
    
    return (
      <View key={item.itemKey} style={styles.orderItemGroup}>
        {individualItems}
      </View>
    );
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
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => onSelectOrder(order)}
    >
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
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Custom Header with Status Filters */}
        <View style={styles.customHeader}>
          <StatusFilter />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header with Status Filters */}
      <View style={styles.customHeader}>
        <StatusFilter />
      </View>
      
      {/* Search and scan row */}
      <View style={styles.searchScanRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Order # or barcode"
            value={manualOrderInput}
            onChangeText={handleInputChange}
            onSubmitEditing={handleManualOrderSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            autoFocus={true}
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleManualOrderSearch}
            disabled={!manualOrderInput.trim()}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Ionicons name="qr-code" size={24} color="#007AFF" />
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
          <Modal 
            visible={!!selectedOrder} 
            animationType="slide" 
            presentationStyle="pageSheet"
          >
            <SafeAreaView style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => {
                    setSelectedOrder(null);
                    setScannedItemsState({});
                  }}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>Order #{selectedOrder.orderNumber}</Text>
                <View style={styles.placeholder} />
              </View>
              
              <ScrollView 
                style={styles.detailContent}
                contentContainerStyle={styles.detailContentContainer}
              >
                <View style={styles.orderInfoSection}>
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="person-outline" size={20} color="#6b7280" />
                    <Text style={styles.orderInfoText}>{selectedOrder.customerName}</Text>
                  </View>
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <Text style={styles.orderInfoText}>
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
                    <Text style={[styles.orderInfoText, styles.orderTotal]}>
                      Total: ${selectedOrder.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsSection}>
                  <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>Order Items</Text>
                  </View>
                  
                  {/* Hide individual items for ready orders and show rack number input instead */}
                  {selectedOrder.status === 'ready' ? (
                    <View style={styles.readyOrderContainer}>
                      <Text style={styles.readyOrderText}>
                        All items ({selectedOrder.items.reduce((total, item) => total + item.quantity, 0)}) have been processed.
                      </Text>
                      <Text style={styles.readyOrderInstructions}>
                        Scan a rack number to complete this order and mark it for pickup.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.itemsList}>
                      {selectedOrder.items.map((item, index) => {
                        // Calculate the global item start index for this item group
                        const globalItemStartIndex = selectedOrder.items
                          .slice(0, index)
                          .reduce((sum, prevItem) => sum + prevItem.quantity, 0);
                        return renderOrderItem(item, globalItemStartIndex);
                      })}
                    </View>
                  )}
                  
                  {/* Item Scan Input */}
                  <View style={styles.itemScanContainer}>
                    <Text style={styles.scanSectionTitle}>Scan Item Labels</Text>
                    <View style={styles.itemScanInputContainer}>
                      <TextInput
                        style={styles.itemScanInput}
                        placeholder={`${selectedOrder.orderNumber}-1, ${selectedOrder.orderNumber}-2, etc.`}
                        value={itemScanInput}
                        onChangeText={handleItemInputChange}
                        onSubmitEditing={handleManualItemScan}
                        returnKeyType="done"
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                      />
                      <TouchableOpacity 
                        style={styles.itemScanButton}
                        onPress={handleManualItemScan}
                        disabled={!itemScanInput.trim()}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Camera Scan Button */}
                  <TouchableOpacity 
                    style={styles.cameraScanButton}
                    onPress={() => setShowItemScanner(true)}
                  >
                    <Ionicons name="qr-code" size={20} color="#007AFF" />
                    <Text style={styles.cameraScanButtonText}>Use Camera Scanner</Text>
                  </TouchableOpacity>
                </View>

                {allItemsScanned && selectedOrder.status !== 'ready' && (
                  <View style={styles.completeSection}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                    <Text style={styles.completeText}>All items scanned!</Text>
                  </View>
                )}

                {/* Rack Scanning Section for Ready Orders */}
                {selectedOrder.status === 'ready' && (
                  <View style={styles.rackScanSection}>
                    <Text style={styles.scanSectionTitle}>Scan Rack Number</Text>
                    <Text style={styles.rackScanDescription}>Scan the rack barcode to complete the order</Text>
                    
                    <View style={styles.itemScanInputContainer}>
                      <TextInput
                        style={styles.itemScanInput}
                        placeholder="Rack number (e.g. R001, A1, etc.)"
                        value={rackScanInput}
                        onChangeText={handleRackInputChange}
                        onSubmitEditing={handleManualRackScan}
                        returnKeyType="done"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                      />
                      <TouchableOpacity 
                        style={styles.itemScanButton}
                        onPress={handleManualRackScan}
                        disabled={!rackScanInput.trim()}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Camera Scan Button for Rack */}
                    <TouchableOpacity 
                      style={styles.cameraScanButton}
                      onPress={() => setShowRackScanner(true)}
                    >
                      <Ionicons name="qr-code" size={20} color="#007AFF" />
                      <Text style={styles.cameraScanButtonText}>Use Camera Scanner</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {/* Only show action bar for ready orders (rack scanning) */}
              {selectedOrder.status === 'ready' && (
                <View style={styles.actionBar}>
                  <TouchableOpacity 
                    style={[
                      styles.actionButton,
                      styles.rackScanPromptButton
                    ]}
                    onPress={() => setShowRackScanner(true)}
                  >
                    <Text style={styles.actionButtonText}>
                      Scan Rack Number to Complete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </Modal>
        )}

        {/* Item Scanner Modal */}
        <Modal visible={showItemScanner} animationType="slide">
          <SafeAreaView style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowItemScanner(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Item Label</Text>
              <View style={styles.placeholder} />
            </View>
            
            <CameraView
              style={styles.scanner}
              facing="back"
              onBarcodeScanned={handleItemQRScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>
                Scan the item label QR code
              </Text>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Rack Scanner Modal */}
        <Modal visible={showRackScanner} animationType="slide">
          <SafeAreaView style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowRackScanner(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Rack Number</Text>
              <View style={styles.placeholder} />
            </View>
            
            <CameraView
              style={styles.scanner}
              facing="back"
              onBarcodeScanned={handleRackQRScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'code39'],
              }}
            />
            
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>
                Scan the rack barcode to complete the order
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Order Item Styles
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scannedItem: {
    opacity: 0.6,
  },
  
  // Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailContentContainer: {
    paddingBottom: 100, // Space for action bar
  },
  
  // Order Info Styles
  orderInfoSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  orderTotal: {
    fontWeight: '600',
    fontSize: 18,
    color: '#000',
  },
  
  // Section Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemsList: {
    marginTop: 8,
  },
  
  // Completion Styles
  completeSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  completeText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  
  // Action Bar Styles
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  // Action Button styles are defined later in the file
  
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  customHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  searchScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  filterScrollView: {
    flexGrow: 1,
    height: 40,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#3b82f6',
  },
  scanButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 40,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
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
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // detailTitle and detailContent are defined earlier in the file
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
  // itemsList is defined earlier in the file
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
  
  // New styles for individual items
  orderItemGroup: {
    marginBottom: 8,
  },
  individualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemOptions: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  itemQRCode: {
    fontSize: 11,
    color: '#007AFF',
    fontFamily: 'monospace',
    marginTop: 2,
    fontWeight: '500',
  },
  qrPreviewContainer: {
    marginLeft: 12,
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  printButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  scanItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  scanItemButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Item scan input styles
  itemScanContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scanSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemScanInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemScanInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemScanButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e7f3ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cameraScanButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Rack Scanning Styles
  rackScanSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  rackScanDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  rackScanPromptButton: {
    backgroundColor: '#dc2626',
  },
  // Print button styles
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  headerPrintButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Ready order styles
  readyOrderContainer: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    alignItems: 'center',
    marginBottom: 16,
  },
  readyOrderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  readyOrderInstructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Item selection styles
  selectableItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedForPrint: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  selectionIndicator: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
