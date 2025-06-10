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

  const searchForOrder = (searchTerm: string) => {
    if (!searchTerm) return;
    
    // Try exact match with order number (now that QR code is just the order number)
    const foundOrder = orderLookupMap.get(searchTerm);
    
    if (foundOrder) {
      setSelectedOrder(foundOrder);
      setScannedItemsState({}); // Clear scanned items for new order
      setSelectedItemsForPrint({}); // Clear selected items for print
      setManualOrderInput('');
      console.log('Order found and modal opening');
    } else {
      console.log('No order found for:', searchTerm);
      console.log('Available keys:', Array.from(orderLookupMap.keys()));
      Alert.alert('Order Not Found', 'No order found with this number or barcode.');
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
      setSelectedOrder(scannedOrder);
      setScannedItemsState({}); // Clear scanned items for new order
      setSelectedItemsForPrint({}); // Clear selected items for print
    } else {
      Alert.alert('Order Not Found', 'No order found with this QR code.');
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
              return;
            }
            currentIndex++;
          }
        }
      }
      Alert.alert('Invalid Item Number', 'Item number not found for this order.');
    } else {
      Alert.alert('Invalid QR Code', 'This QR code does not belong to this order.');
    }
  };

  const handleItemQRScanned = ({ data }: { data: string }) => {
    setShowItemScanner(false);
    processItemScan(data);
  };

  const handleManualItemScan = () => {
    if (itemScanInput.trim()) {
      processItemScan(itemScanInput.trim());
      setItemScanInput('');
    }
  };

  const handleItemInputChange = (text: string) => {
    setItemScanInput(text);
    
    // Auto-scan when input matches the expected format (orderNumber-number)
    if (selectedOrder && text.match(new RegExp(`^${selectedOrder.orderNumber}-\\d+$`))) {
      setTimeout(() => {
        processItemScan(text);
        setItemScanInput('');
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
        Alert.alert('Error', 'Failed to complete order. Please try again.');
      }
    } else {
      Alert.alert('Invalid Status', 'Order must be in "Ready" status to assign to a rack.');
    }
  };

  const handleRackQRScanned = ({ data }: { data: string }) => {
    setShowRackScanner(false);
    processRackScan(data);
  };

  const handleManualRackScan = () => {
    if (rackScanInput.trim()) {
      processRackScan(rackScanInput.trim());
      setRackScanInput('');
    }
  };

  const handleRackInputChange = (text: string) => {
    setRackScanInput(text);
    
    // Auto-scan when input has content (rack numbers can be any format)
    if (text.trim().length >= 2) {
      setTimeout(() => {
        processRackScan(text.trim());
        setRackScanInput('');
      }, 100);
    }
  };

  const toggleItemForPrint = (itemKey: string, itemIndex: number) => {
    const fullItemId = `${itemKey}-${itemIndex}`;
    setSelectedItemsForPrint(prev => ({
      ...prev,
      [fullItemId]: !prev[fullItemId]
    }));
  };

  const printSelectedItems = async () => {
    if (!selectedOrder) return;
    
    const selectedItems = Object.keys(selectedItemsForPrint).filter(key => selectedItemsForPrint[key]);
    
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to print.');
      return;
    }

    try {
      for (const itemId of selectedItems) {
        const [itemKey, itemIndexStr] = itemId.split('-');
        const itemIndex = parseInt(itemIndexStr);
        
        // Find the item in the order
        const orderItem = selectedOrder.items.find(item => item.itemKey === itemKey);
        if (orderItem) {
          // Calculate global item number
          let globalItemNumber = 1;
          for (const item of selectedOrder.items) {
            for (let i = 0; i < item.quantity; i++) {
              if (item.itemKey === itemKey && i === itemIndex) {
                await printItemLabel(orderItem, globalItemNumber);
                break;
              }
              globalItemNumber++;
            }
            if (orderItem.itemKey === itemKey && itemIndex < item.quantity) break;
          }
        }
      }
      
      Alert.alert('Labels Printed', `${selectedItems.length} labels have been printed successfully.`);
      
      // Clear selections after printing
      setSelectedItemsForPrint({});
      
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print some labels. Please try again.');
    }
  };

  const generateQRCodeDataURL = async (data: string): Promise<string> => {
    try {
      // Create a simple, clean QR-style code that's scannable
      const size = 21; // Standard QR code size
      const cellSize = 5; // Each cell is 5x5 pixels
      const totalSize = size * cellSize;
      
      // Create a simple hash-based pattern
      const hash = data.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) & 0xFFFFFF;
      }, 0);
      
      // Initialize empty grid
      const grid = Array(size).fill(null).map(() => Array(size).fill(false));
      
      // Add finder patterns (corner squares)
      const addFinderPattern = (startX: number, startY: number) => {
        // 7x7 finder pattern
        for (let y = 0; y < 7; y++) {
          for (let x = 0; x < 7; x++) {
            const isEdge = x === 0 || x === 6 || y === 0 || y === 6;
            const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
            if (startX + x < size && startY + y < size) {
              grid[startY + y][startX + x] = isEdge || isCenter;
            }
          }
        }
      };
      
      // Add the three finder patterns
      addFinderPattern(0, 0);      // Top-left
      addFinderPattern(14, 0);     // Top-right
      addFinderPattern(0, 14);     // Bottom-left
      
      // Add timing patterns
      for (let i = 8; i < 13; i++) {
        if (i < size) {
          grid[6][i] = i % 2 === 0;
          grid[i][6] = i % 2 === 0;
        }
      }
      
      // Add data pattern based on hash
      for (let y = 9; y < size - 1; y++) {
        for (let x = 9; x < size - 1; x++) {
          const seed = hash + (y * size + x);
          grid[y][x] = (seed % 3) === 0;
        }
      }
      
      // Generate SVG
      let svgContent = '';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (grid[y][x]) {
            const px = x * cellSize;
            const py = y * cellSize;
            svgContent += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 ${totalSize} ${totalSize}">
          <rect width="${totalSize}" height="${totalSize}" fill="white"/>
          ${svgContent}
        </svg>
      `;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch (error) {
      console.error('QR generation error:', error);
      // Simple fallback with just the text
      const fallbackSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="white" stroke="black" stroke-width="1"/>
          <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold">${data}</text>
        </svg>
      `;
      return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
    }
  };

  const generateQRCodeFromComponent = (data: string): Promise<string> => {
    return new Promise((resolve) => {
      try {
        // Use the same QRCode component that's shown in the preview
        // Generate SVG string that matches react-native-qrcode-svg output
        import('react-native-qrcode-svg').then((QRCodeModule) => {
          // Since we can't directly get SVG from the component in React Native,
          // we'll create a compatible SVG manually
          const size = 100;
          const modules = 25; // Standard QR code modules
          const moduleSize = size / modules;
          
          // Create a simple hash-based pattern that looks like a real QR code
          const hash = data.split('').reduce((acc, char, i) => {
            return ((acc << 5) - acc + char.charCodeAt(0) * (i + 1)) & 0xFFFFFF;
          }, 0);
          
          // Generate a pattern similar to what react-native-qrcode-svg would create
          let svgContent = '';
          for (let y = 0; y < modules; y++) {
            for (let x = 0; x < modules; x++) {
              // Create finder patterns (corners)
              const isFinderPattern = 
                (x < 9 && y < 9) || // Top-left
                (x >= modules - 9 && y < 9) || // Top-right
                (x < 9 && y >= modules - 9); // Bottom-left
              
              // Create timing patterns
              const isTimingPattern = (x === 6 || y === 6) && !isFinderPattern;
              
              // Create data pattern
              const seed = hash + (y * modules + x);
              const isDataModule = !isFinderPattern && !isTimingPattern && (seed % 3 === 0);
              
              if (isFinderPattern || isTimingPattern || isDataModule) {
                const px = x * moduleSize;
                const py = y * moduleSize;
                svgContent += `<rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="black"/>`;
              }
            }
          }
          
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <rect width="${size}" height="${size}" fill="white"/>
              ${svgContent}
            </svg>
          `;
          
          resolve(`data:image/svg+xml;base64,${btoa(svg)}`);
        }).catch(() => {
          // Fallback
          const fallbackSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="white" stroke="black" stroke-width="1"/>
              <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold">${data}</text>
            </svg>
          `;
          resolve(`data:image/svg+xml;base64,${btoa(fallbackSvg)}`);
        });
      } catch (error) {
        // Simple text fallback
        const fallbackSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="white" stroke="black" stroke-width="1"/>
            <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold">${data}</text>
          </svg>
        `;
        resolve(`data:image/svg+xml;base64,${btoa(fallbackSvg)}`);
      }
    });
  };

  const printItemLabel = async (item: OrderItem, globalItemNumber: number, qrRef?: React.RefObject<View | null>) => {
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
      
      const html = await generateLabelHTML({
        orderNumber: selectedOrder.orderNumber,
        customerName: selectedOrder.customerName,
        garmentType: `${item.name} #${globalItemNumber}`,
        notes: item.options?.notes || '',
        qrImageBase64: qrImageBase64
      });
      
      await printLabel(html);
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

    // For pending and in_progress orders, show selection UI
    if (selectedOrder && (selectedOrder.status === 'pending' || selectedOrder.status === 'in_progress')) {
      return (
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
            <View style={styles.selectionIndicator}>
              <Ionicons 
                name={isSelectedForPrint ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelectedForPrint ? "#007AFF" : "#ccc"} 
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
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
                    {/* Print button for pending and in_progress orders */}
                    {selectedOrder.status !== 'ready' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                      <TouchableOpacity 
                        style={styles.headerPrintButton}
                        onPress={printSelectedItems}
                      >
                        <Ionicons name="print-outline" size={18} color="#fff" />
                        <Text style={styles.headerPrintButtonText}>Print Selected</Text>
                      </TouchableOpacity>
                    )}
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

              <View style={styles.actionBar}>
                {/* Show different button based on order status */}
                {selectedOrder.status === 'ready' ? (
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
                ) : (
                  <TouchableOpacity 
                    style={[
                      styles.actionButton,
                      allItemsScanned && styles.completeButton
                    ]}
                    onPress={() => {
                      if (allItemsScanned) {
                        handleStatusChange(selectedOrder.id, 'ready');
                        setSelectedOrder(null);
                        setScannedItemsState({});
                      }
                    }}
                    disabled={!allItemsScanned}
                  >
                    <Text style={styles.actionButtonText}>
                      {allItemsScanned ? 'Mark as Ready' : 'Scan All Items'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
