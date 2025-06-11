import { useState, useMemo, useRef } from 'react';
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
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { captureRef } from 'react-native-view-shot';
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
  const [selectedItemsForPrint, setSelectedItemsForPrint] = useState<{[key: string]: boolean}>({});
  const [manualOrderInput, setManualOrderInput] = useState('');
  const [showItemScanner, setShowItemScanner] = useState(false);
  const [itemScanInput, setItemScanInput] = useState('');
  const [showRackScanner, setShowRackScanner] = useState(false);
  const [rackScanInput, setRackScanInput] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  // Store QR refs for mass printing
  const qrRefs = useRef<{[key: string]: React.RefObject<View | null>}>({});
  const { orders, loading, updateOrderStatus, updateOrderStatusAndRack } = useOrders(selectedStatus === 'all' ? undefined : selectedStatus);
  
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

  // Helper function to auto-select all items for pending orders
  const autoSelectAllItemsForPrint = (order: OrderDocument) => {
    if (order.status === 'pending') {
      const allItemsSelected: {[key: string]: boolean} = {};
      order.items.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          const itemId = `${item.itemKey}-${i}`;
          allItemsSelected[itemId] = true;
        }
      });
      setSelectedItemsForPrint(allItemsSelected);
    } else {
      setSelectedItemsForPrint({});
    }
  };

  const toggleItemForPrint = (itemKey: string, itemIndex: number) => {
    const fullItemId = `${itemKey}-${itemIndex}`;
    setSelectedItemsForPrint(prev => ({
      ...prev,
      [fullItemId]: !prev[fullItemId]
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
    setScannedItemsState({}); // Clear scanned items for new order
    autoSelectAllItemsForPrint(order); // Auto-select items for pending orders
  };

  const showTimedNotification = (message: string) => {
    setNotificationMessage(message);
    setTimeout(() => {
      setNotificationMessage('');
    }, 2000); // Hide after 2 seconds
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
      showTimedNotification(`Order "${searchTerm}" not found`);
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
    // Clear input immediately
    setItemScanInput('');
    
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
              
              console.log(`✅ Item scanned: ${item.name} #${globalItemNumber}`);
              
              // Check if all items are now scanned and auto-close
              setTimeout(() => {
                checkAndAutoCloseIfAllScanned(itemId);
              }, 200); // Small delay to ensure state is updated
              
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
      // Input already cleared at start of function
    }
  };

  const checkAndAutoCloseIfAllScanned = (newlyScannedItemId?: string) => {
    if (!selectedOrder) return;
    
    // Auto-close for both pending and in_progress orders
    if (selectedOrder.status !== 'pending' && selectedOrder.status !== 'in_progress') return;
    
    // Get current scanned state including the newly scanned item
    const currentScannedState = { ...scannedItemsState };
    if (newlyScannedItemId) {
      currentScannedState[newlyScannedItemId] = true;
    }
    
    // Check if all items are scanned
    const allScanned = selectedOrder.items.every(item => {
      for (let i = 0; i < item.quantity; i++) {
        const itemId = `${item.itemKey}-${i}`;
        if (!currentScannedState[itemId]) {
          return false;
        }
      }
      return true;
    });
    
    console.log('🔍 Checking auto-close:', {
      allScanned,
      totalItems: selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0),
      scannedCount: Object.keys(currentScannedState).length,
      orderStatus: selectedOrder.status
    });
    
    if (allScanned) {
      // Determine the next status based on current status
      let nextStatus: 'in_progress' | 'ready';
      if (selectedOrder.status === 'pending') {
        nextStatus = 'in_progress';
        console.log('🎉 All items scanned for pending order! Updating status to in_progress and closing modal.');
      } else {
        nextStatus = 'ready';
        console.log('🎉 All items scanned for in_progress order! Updating status to ready and closing modal.');
      }
      
      // Update order status
      updateOrderStatus(selectedOrder.id, nextStatus)
        .then(() => {
          // Close the modal
          setSelectedOrder(null);
          setScannedItemsState({}); // Clear scanned items state
          setSelectedItemsForPrint({}); // Clear print selections
          
          console.log(`✅ Order #${selectedOrder.orderNumber} updated to ${nextStatus} status`);
        })
        .catch((error) => {
          console.error('Failed to update order status:', error);
          Alert.alert('Error', 'All items scanned but failed to update order status. Please try again.');
        });
    } else {
      console.log('⏳ Not all items scanned yet, keeping modal open');
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
        await updateOrderStatusAndRack(selectedOrder.id, 'completed', rackNumber);
        
        console.log(`Order ${selectedOrder.orderNumber} moved to rack ${rackNumber} and marked as completed`);
        
        // Close modal automatically without alert
        setSelectedOrder(null);
        setScannedItemsState({});
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

  const printSelectedItems = async () => {
    if (!selectedOrder) return;
    
    const selectedItems = Object.keys(selectedItemsForPrint).filter(key => selectedItemsForPrint[key]);
    
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to print.');
      return;
    }


    try {
      console.log(`🖨️ Starting mass print of ${selectedItems.length} labels...`);
      
      // Build combined HTML for all selected items
      let combinedHTML = '';
      const validItems = [];
      
      for (const itemId of selectedItems) {
        const lastHyphenIndex = itemId.lastIndexOf('-');
        const itemKey = itemId.substring(0, lastHyphenIndex);
        const itemIndexStr = itemId.substring(lastHyphenIndex + 1);
        const itemIndex = parseInt(itemIndexStr);
        
        // Find the item in the order
        const orderItem = selectedOrder.items.find(item => item.itemKey === itemKey);
        if (!orderItem) {
          console.error(`❌ Could not find order item with key: ${itemKey}`);
          continue;
        }
        
        // Calculate global item number
        let globalItemNumber = 1;
        let found = false;
        
        for (const item of selectedOrder.items) {
          for (let j = 0; j < item.quantity; j++) {
            if (item.itemKey === itemKey && j === itemIndex) {
              found = true;
              break;
            }
            globalItemNumber++;
          }
          if (found) break;
        }
        
        if (!found) {
          console.error(`❌ Could not calculate global item number for ${itemKey}-${itemIndex}`);
          continue;
        }
        
        validItems.push({ orderItem, globalItemNumber, itemId, itemKey, itemIndex });
      }
      
      if (validItems.length === 0) {
        Alert.alert('Error', 'No valid items found for printing.');
        return;
      }
      
      // Generate HTML for each item and combine
      for (let i = 0; i < validItems.length; i++) {
        const { orderItem, globalItemNumber, itemKey, itemIndex } = validItems[i];
        const qrData = `${selectedOrder.orderNumber}-${globalItemNumber}`;
        
        // Get QR ref and try to capture, fallback to QR data
        const itemRefId = `${itemKey}-${itemIndex}`;
        const qrRef = qrRefs.current[itemRefId];
        
        let qrImageBase64 = qrData; // Default to QR data
        
        // Try to capture QR code if ref is available
        if (qrRef?.current) {
          try {
            const capturedBase64 = await captureRef(qrRef.current, {
              format: 'png',
              quality: 1,
              result: 'base64',
              width: 100,
              height: 100,
            });
            
            if (capturedBase64.length > 1000) {
              qrImageBase64 = capturedBase64;
            }
          } catch (captureError) {
            console.warn('QR capture failed for', itemRefId, ':', captureError);
          }
        }
        
        // Generate individual label HTML
        const labelHTML = await generateLabelHTML({
          orderNumber: selectedOrder.orderNumber,
          customerName: selectedOrder.customerName,
          garmentType: `${orderItem.name} #${globalItemNumber}`,
          notes: orderItem.options?.notes || '',
          qrImageBase64: qrImageBase64,
          starch: orderItem.options?.starch,
          pressOnly: orderItem.options?.pressOnly
        });
        
        // Add page break after each label except the last one
        combinedHTML += labelHTML;
        if (i < validItems.length - 1) {
          combinedHTML += '<div style="page-break-after: always;"></div>';
        }
      }
      
      console.log(`📋 Generated combined HTML for ${validItems.length} labels, size: ${combinedHTML.length}`);
      
      // Use the printLabel function with just the body content
      const result = await printLabel(combinedHTML);
      
      // Check if print was cancelled
      if (result === null) {
        console.log('ℹ️ Mass print cancelled by user');
        return;
      }
      
      console.log(`✅ Mass print completed successfully for ${validItems.length} labels`);
      Alert.alert('Success', `${validItems.length} label${validItems.length > 1 ? 's' : ''} printed successfully.`);
      
      // Clear selections after successful printing
      setSelectedItemsForPrint({});
      
    } catch (error) {
      console.error('❌ Mass print error:', error);
      Alert.alert('Print Error', 'Failed to print labels. Please try again or print individually.');
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
        qrImageBase64: qrImageBase64,
        starch: item.options?.starch,
        pressOnly: item.options?.pressOnly
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
    isSelectedForPrint,
    qrData
  }: {
    item: OrderItem;
    itemIndex: number;
    globalItemNumber: number;
    isScanned: boolean;
    isSelectedForPrint: boolean;
    qrData: string;
  }) => {
    const qrRef = useRef<View>(null);
    
    // Store the ref for mass printing
    const itemId = `${item.itemKey}-${itemIndex}`;
    qrRefs.current[itemId] = qrRef;

    // For pending and in_progress orders, show both selection UI AND individual print buttons
    if (selectedOrder && (selectedOrder.status === 'pending' || selectedOrder.status === 'in_progress')) {
      return (
        <View style={[styles.individualItem, isScanned && styles.scannedItemHighlight]}>
          <TouchableOpacity 
            style={[
              styles.selectableItem, 
              isSelectedForPrint && styles.selectedForPrint
            ]}
            onPress={() => toggleItemForPrint(item.itemKey, itemIndex)}
          >
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
              {/* QR Code Preview for selectable items */}
              <View ref={qrRef} style={styles.qrPreviewContainer} collapsable={false}>
                <QRCode
                  value={qrData}
                  size={40}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <View style={styles.selectionIndicator}>
                <Ionicons 
                  name={isSelectedForPrint ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelectedForPrint ? "#007AFF" : "#ccc"} 
                />
              </View>
            </View>
          </TouchableOpacity>
          {/* Individual Print Button */}
          <TouchableOpacity 
            style={[styles.printButton, { alignSelf: 'center' }]}
            onPress={() => printItemLabel(item, globalItemNumber, qrRef)}
          >
            <Ionicons name="print" size={16} color="#007AFF" />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // For ready orders, don't show individual items (handled in parent)
    if (selectedOrder && selectedOrder.status === 'ready') {
      return null;
    }
    
    // Default view for other statuses (completed, cancelled)
    return (
      <View style={[styles.individualItem, isScanned && styles.scannedItemHighlight]}>
        <View style={styles.itemMainContent}>
          <View style={styles.itemCheckbox}>
            {isScanned && (
              <Ionicons name="checkmark" size={20} color="#10b981" />
            )}
          </View>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name} #{globalItemNumber}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            <Text style={styles.itemQRCode}>QR: {qrData}</Text>
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
          {/* QR Code Preview */}
          <View ref={qrRef} style={styles.qrPreviewContainer} collapsable={false}>
            <QRCode
              value={qrData}
              size={40}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>
        </View>
        <TouchableOpacity 
          style={styles.printButton}
          onPress={() => printItemLabel(item, globalItemNumber, qrRef)}
        >
          <Ionicons name="print" size={16} color="#007AFF" />
          <Text style={styles.printButtonText}>Print</Text>
        </TouchableOpacity>
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
      const isSelectedForPrint = selectedItemsForPrint[itemId] || false;
      
      individualItems.push(
        <IndividualItemComponent
          key={itemId}
          item={item}
          itemIndex={i}
          globalItemNumber={globalItemNumber}
          isScanned={isScanned}
          isSelectedForPrint={isSelectedForPrint}
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
        {order.items.slice(0, 2).map((item) => (
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

      {/* Timed Notification */}
      {notificationMessage ? (
        <View style={styles.notificationContainer}>
          <View style={styles.notificationContent}>
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </View>
      ) : null}
        
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
                    setSelectedItemsForPrint({});
                  }}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.detailTitleContainer}>
                  <Text style={styles.detailTitle}>Order #{selectedOrder.orderNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                    <Ionicons name={getStatusIcon(selectedOrder.status) as any} size={14} color="white" />
                    <Text style={styles.statusText}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.placeholder} />
              </View>
              
              <View style={styles.detailContent}>
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
                    {/* Print button for pending and in_progress orders */}
                    {selectedOrder.status !== 'ready' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'picked_up' && (
                      <TouchableOpacity 
                        style={styles.headerPrintButton}
                        onPress={printSelectedItems}
                      >
                        <Ionicons name="print-outline" size={18} color="#fff" />
                        <Text style={styles.headerPrintButtonText}>Print Selected</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Item Scan Section - moved below print button and disabled for ready and completed orders */}
                  {selectedOrder.status !== 'ready' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'picked_up' && (
                    <View style={styles.itemScanContainer}>
                      <Text style={styles.scanSectionTitle}>Scan Item Labels</Text>
                      {/* Search and scan row - same as main screen */}
                      <View style={styles.searchScanRow}>
                        <View style={styles.searchContainer}>
                          <TextInput
                            style={styles.searchInput}
                            placeholder={`${selectedOrder.orderNumber}-1, ${selectedOrder.orderNumber}-2, etc.`}
                            value={itemScanInput}
                            onChangeText={handleItemInputChange}
                            onSubmitEditing={handleManualItemScan}
                            returnKeyType="search"
                            autoCapitalize="none"
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                          />
                          <TouchableOpacity 
                            style={styles.searchButton} 
                            onPress={handleManualItemScan}
                            disabled={!itemScanInput.trim()}
                          >
                            <Ionicons name="search" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                          style={styles.scanButton} 
                          onPress={() => setShowItemScanner(true)}
                        >
                          <Ionicons name="qr-code" size={24} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {/* Handle different order statuses */}
                  {selectedOrder.status === 'picked_up' ? (
                    <View style={styles.pickedUpOrderContainer}>
                      <View style={styles.pickedUpHeaderContainer}>
                        <Ionicons name="checkmark-circle" size={32} color="#059669" />
                        <Text style={styles.pickedUpOrderText}>
                          Order Picked Up
                        </Text>
                      </View>
                      <Text style={styles.pickedUpOrderDetails}>
                        This order has been collected by the customer.
                      </Text>
                      
                      {/* Status History */}
                      {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                        <View style={styles.statusHistoryContainer}>
                          <Text style={styles.statusHistoryTitle}>Order History</Text>
                          <ScrollView style={styles.statusHistoryList} showsVerticalScrollIndicator={false}>
                            {selectedOrder.statusHistory.map((entry, index) => (
                              <View key={index} style={styles.statusHistoryEntry}>
                                <View style={styles.statusHistoryDot} />
                                <Text style={styles.statusHistoryText}>{entry}</Text>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      
                      {/* Basic Order Info */}
                      <View style={styles.pickedUpOrderSummary}>
                        <Text style={styles.pickedUpSummaryTitle}>Order Summary</Text>
                        <Text style={styles.pickedUpSummaryText}>
                          Items: {selectedOrder.items.reduce((total, item) => total + item.quantity, 0)}
                        </Text>
                        <Text style={styles.pickedUpSummaryText}>
                          Total: ${selectedOrder.total.toFixed(2)}
                        </Text>
                        {selectedOrder.rackNumber && (
                          <Text style={styles.pickedUpSummaryText}>
                            Rack: {selectedOrder.rackNumber}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : selectedOrder.status === 'completed' ? (
                    <View style={styles.completedOrderContainer}>
                      <Text style={styles.completedOrderText}>
                        Order completed and ready for pickup.
                      </Text>
                      <Text style={styles.completedOrderDetails}>
                        All {selectedOrder.items.reduce((total, item) => total + item.quantity, 0)} items have been processed and stored.
                      </Text>
                      <View style={styles.rackDisplayContainer}>
                        <Ionicons name="cube-outline" size={24} color="#059669" />
                        <Text style={styles.rackDisplayText}>
                          Rack: {selectedOrder.rackNumber || 'Not assigned'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.undoButton}
                        onPress={async () => {
                          try {
                            await updateOrderStatus(selectedOrder.id, 'ready');
                            console.log(`Order #${selectedOrder.orderNumber} moved back to ready status`);
                            
                            // Close the modal automatically
                            setSelectedOrder(null);
                            setSelectedItemsForPrint({});
                          } catch (error) {
                            console.error('Failed to undo order status:', error);
                            Alert.alert('Error', 'Failed to reset order status. Please try again.');
                          }
                        }}
                      >
                        <Ionicons name="arrow-undo" size={16} color="#6b7280" />
                        <Text style={styles.undoButtonText}>Undo - Back to Ready</Text>
                      </TouchableOpacity>
                    </View>
                  ) : selectedOrder.status === 'ready' ? (
                    <View style={styles.readyOrderContainer}>
                      <Text style={styles.readyOrderText}>
                        All items ({selectedOrder.items.reduce((total, item) => total + item.quantity, 0)}) have been processed.
                      </Text>
                      <Text style={styles.readyOrderInstructions}>
                        Scan a rack number to complete this order and mark it for pickup.
                      </Text>
                      <TouchableOpacity 
                        style={styles.undoButton}
                        onPress={async () => {
                          try {
                            await updateOrderStatus(selectedOrder.id, 'in_progress');
                            setScannedItemsState({}); // Reset scanned items
                            console.log(`Order #${selectedOrder.orderNumber} moved back to in_progress status`);
                            
                            // Close the modal automatically
                            setSelectedOrder(null);
                            setSelectedItemsForPrint({});
                          } catch (error) {
                            console.error('Failed to undo order status:', error);
                            Alert.alert('Error', 'Failed to reset order status. Please try again.');
                          }
                        }}
                      >
                        <Ionicons name="arrow-undo" size={16} color="#6b7280" />
                        <Text style={styles.undoButtonText}>Undo - Reset to In Progress</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.itemsListContainer}>
                      <ScrollView 
                        style={styles.itemsList}
                        showsVerticalScrollIndicator={false}
                      >
                        {selectedOrder.items.map((item, index) => {
                          // Calculate the global item start index for this item group
                          const globalItemStartIndex = selectedOrder.items
                            .slice(0, index)
                            .reduce((sum, prevItem) => sum + prevItem.quantity, 0);
                          return renderOrderItem(item, globalItemStartIndex);
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {allItemsScanned && selectedOrder.status !== 'ready' && (
                  <View style={styles.completeSection}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                    <Text style={styles.completeText}>All items scanned!</Text>
                  </View>
                )}

                {/* Rack Scanning Section for Ready Orders only */}
                {selectedOrder.status === 'ready' && (
                  <View style={styles.rackScanSection}>
                    <Text style={styles.scanSectionTitle}>Scan Rack Number</Text>
                    <Text style={styles.rackScanDescription}>Scan the rack barcode to complete the order</Text>
                    
                    {/* Search and scan row - same as main screen */}
                    <View style={styles.searchScanRow}>
                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Rack number (e.g. R001, A1, etc.)"
                          value={rackScanInput}
                          onChangeText={handleRackInputChange}
                          onSubmitEditing={handleManualRackScan}
                          returnKeyType="search"
                          autoCapitalize="characters"
                          autoCorrect={false}
                          clearButtonMode="while-editing"
                        />
                        <TouchableOpacity 
                          style={styles.searchButton} 
                          onPress={handleManualRackScan}
                          disabled={!rackScanInput.trim()}
                        >
                          <Ionicons name="search" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity 
                        style={styles.scanButton} 
                        onPress={() => setShowRackScanner(true)}
                      >
                        <Ionicons name="qr-code" size={24} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

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
  scannedItemHighlight: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  
  // Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    overflow: 'hidden', // Prevent content from overflowing container
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailTitle: {
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
  itemsListContainer: {
    flex: 1,
    marginTop: 8,
  },
  itemsList: {
    maxHeight: 400, // Fixed height for scroll container
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
    marginTop: 16,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
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
    marginBottom: 16,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  undoButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Completed order styles
  completedOrderContainer: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    marginBottom: 16,
  },
  completedOrderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedOrderDetails: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  rackDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
    gap: 8,
  },
  rackDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  // Item selection styles
  selectableItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
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
  // Notification styles
  notificationContainer: {
    backgroundColor: '#fef3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
  // Picked up order styles
  pickedUpOrderContainer: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pickedUpHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  pickedUpOrderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#059669',
  },
  pickedUpOrderDetails: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusHistoryContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusHistoryList: {
    maxHeight: 200,
  },
  statusHistoryEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  statusHistoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginTop: 6,
  },
  statusHistoryText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  pickedUpOrderSummary: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickedUpSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickedUpSummaryText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
});
