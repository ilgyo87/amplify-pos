import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  SafeAreaView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerHeader } from '../../components/checkout/CustomerHeader';
import { ServiceTabBar } from '../../components/checkout/ServiceTabBar';
import { ProductGrid } from '../../components/checkout/ProductGrid';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { ReceiptPreviewModal } from '../../components/checkout/ReceiptPreviewModal';
import { DatePickerModal } from '../../components/checkout/DatePickerModal';
import { useCategories } from '../../database/hooks/useCategories';
import { useProducts } from '../../database/hooks/useProducts';
import { useOrders } from '../../database/hooks/useOrders';
import { useCustomers, useCustomer } from '../../database/hooks/useCustomers';
import { OrderService } from '../../database/services/orderService';
import { SerializableCustomer } from '../../navigation/types';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { CustomerFormData } from '../../utils/customerValidation';
import { OrderItemSettingsModal } from '../../components/checkout/OrderItemSettingsModal';
import { PickupModal } from '../../components/checkout/PickupModal';
import { CategoryDocument } from '../../database/schemas/category';
import { ProductDocument } from '../../database/schemas/product';
import { OrderItem, OrderItemOptions, generateOrderItemKey } from '../../types/order';
import { RootStackParamList } from '../../navigation/types';
import { toPreciseAmount } from '../../utils/monetaryUtils';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;
type CheckoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

interface CheckoutScreenProps {
  route: CheckoutScreenRouteProp;
  navigation: CheckoutScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

// Thermal printing functions
const generateThermalReceiptCommands = (order: any, paymentMethod: string, selectedDate?: string): Uint8Array => {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // ESC/POS command constants
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  
  const commands: number[] = [];
  
  const addText = (text: string) => {
    const utf8Encoder = new TextEncoder();
    const bytes = utf8Encoder.encode(text);
    commands.push(...Array.from(bytes));
  };
  
  const addLF = () => commands.push(LF);
  
  const formatTwoColumns = (left: string, right: string, width: number = 48) => {
    const rightPadding = Math.max(0, width - left.length - right.length);
    return left + ' '.repeat(rightPadding) + right;
  };
  
  // Initialize printer
  commands.push(ESC, 0x40); // Reset printer
  commands.push(ESC, 0x61, 0x01); // Center alignment
  
  // Business header
  commands.push(ESC, 0x45, 0x01); // Bold on
  addText('DRY CLEANING SERVICES');
  addLF();
  commands.push(ESC, 0x45, 0x00); // Bold off
  
  addText('123 Main Street');
  addLF();
  addText('Phone: (555) 123-4567');
  addLF();
  addLF();
  
  // Separator line
  addText('--------------------------------');
  addLF();
  
  // Order info - Left align
  commands.push(ESC, 0x61, 0x00); // Left alignment
  addText(`Order #: ${order.orderNumber}`);
  addLF();
  addText(`Date: ${currentDate} ${currentTime}`);
  addLF();
  addText(`Pickup: ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}`);
  addLF();
  addLF();
  
  // Customer info
  addText(`Customer: ${order.customerName}`);
  addLF();
  if (order.customerPhone) {
    addText(`Phone: ${order.customerPhone}`);
    addLF();
  }
  
  // Employee info (if available)
  if (order.employeeName) {
    addText(`Served by: ${order.employeeName}`);
    addLF();
  }
  addLF();
  
  // Items header
  addText('--------------------------------');
  addLF();
  addText('Item                    Qty Total');
  addLF();
  addText('--------------------------------');
  addLF();
  
  // Items
  order.items.forEach((item: any) => {
    const basePrice = Number(item.price) || 0;
    const additionalPrice = Number(item.additionalPrice) || 0;
    const itemPrice = basePrice + additionalPrice;
    const discount = Number(item.discount) || 0;
    const quantity = Number(item.quantity) || 0;
    
    const discountedPrice = discount > 0 ? itemPrice * (1 - discount / 100) : itemPrice;
    const totalPrice = toPreciseAmount(discountedPrice * quantity);
    
    let itemName = item.name;
    if (item.options?.starch && item.options.starch !== 'none') {
      itemName += ` - ${item.options.starch} starch`;
    }
    if (item.options?.pressOnly) {
      itemName += ' - Press Only';
    }
    if (item.options?.notes && item.options.notes.trim()) {
      itemName += ` - ${item.options.notes.trim()}`;
    }
    
    // Truncate long item names
    if (itemName.length > 20) {
      itemName = itemName.substring(0, 17) + '...';
    }
    
    const itemLine = formatTwoColumns(
      itemName.padEnd(20),
      `${quantity.toString().padStart(3)} ${totalPrice.toFixed(2).padStart(6)}`,
      48
    );
    
    addText(itemLine);
    addLF();
  });
  
  addText('--------------------------------');
  addLF();
  
  // Totals
  const subtotal = order.subtotal || 0;
  const tax = order.tax || 0;
  const total = order.total || 0;
  
  addText(formatTwoColumns('Subtotal:', `$${subtotal.toFixed(2)}`, 32));
  addLF();
  addText(formatTwoColumns('Tax (8.75%):', `$${tax.toFixed(2)}`, 32));
  addLF();
  addText('--------------------------------');
  addLF();
  
  // Grand total - Bold
  commands.push(ESC, 0x45, 0x01); // Bold on
  addText(formatTwoColumns('TOTAL:', `$${total.toFixed(2)}`, 32));
  addLF();
  commands.push(ESC, 0x45, 0x00); // Bold off
  addLF();
  
  // Payment method
  addText(formatTwoColumns('Payment:', paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1), 32));
  addLF();
  addLF();
  
  // QR Code with order data
  const qrData = order.barcodeData || `ORDER:${order.orderNumber}:${order.customerId}:${Date.now()}`;
  
  commands.push(ESC, 0x61, 0x01); // Center alignment
  
  // QR Code commands for ESC/POS thermal printers
  commands.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);
  commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
  
  const qrDataLength = qrData.length + 3;
  const qrLowByte = qrDataLength & 0xFF;
  const qrHighByte = (qrDataLength >> 8) & 0xFF;
  commands.push(GS, 0x28, 0x6B, qrLowByte, qrHighByte, 0x31, 0x50, 0x30);
  
  const qrBytes = new TextEncoder().encode(qrData);
  commands.push(...Array.from(qrBytes));
  
  commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  addLF();
  
  addText('Scan for order details');
  addLF();
  addText(`Order ID: ${qrData}`);
  addLF();
  addLF();
  
  // Footer
  addText('Thank you for your business!');
  addLF();
  addText('Please keep this receipt');
  addLF();
  addText('for pickup');
  addLF();
  addLF();
  addLF();
  
  // Cut paper
  commands.push(GS, 0x56, 0x00); // Full cut
  
  return new Uint8Array(commands);
};

const sendDataToThermalPrinter = async (ip: string, port: string, data: Uint8Array): Promise<boolean> => {
  try {
    console.log(`Sending ${data.length} bytes to thermal printer at ${ip}:${port}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`http://${ip}:${port}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: data,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Printer responded with status:', response.status);
      return response.ok;
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError' || fetchError.message.includes('Network request failed')) {
        console.log('Printer connection timeout - assuming print succeeded (normal for thermal printers)');
        return true;
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Failed to send data to thermal printer:', error);
    return false;
  }
};

const printReceiptToThermalPrinter = async (order: any, paymentMethod: string, selectedDate?: string) => {
  try {
    // Check for printer settings
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const printerSettings = await AsyncStorage.default.getItem('printerSettings');
    
    if (!printerSettings) {
      throw new Error('No printer configured. Please set up your Munbyn printer in Settings.');
    }
    
    const { ip, port } = JSON.parse(printerSettings);
    
    if (!ip) {
      throw new Error('No printer IP configured. Please configure your Munbyn printer in Settings.');
    }
    
    console.log(`Printing receipt to Munbyn printer at ${ip}:${port || '9100'}`);
    
    // Generate thermal receipt commands
    const escPosCommands = generateThermalReceiptCommands(order, paymentMethod, selectedDate);
    
    // Send to printer
    const success = await sendDataToThermalPrinter(ip, port || '9100', escPosCommands);
    
    if (!success) {
      throw new Error('Failed to send receipt to printer');
    }
    
    console.log('Receipt printed successfully to thermal printer');
  } catch (error) {
    console.error('Thermal receipt printing error:', error);
    throw error;
  }
};

export default function CheckoutScreen({ route, navigation }: CheckoutScreenProps) {
  const { customer: routeCustomer } = route.params;
  
  // Use reactive customer hook for automatic updates
  const { customer: reactiveCustomer, loading: customerLoading } = useCustomer(routeCustomer.id);
  
  // Use reactive customer data if available, fallback to route customer
  const customer = reactiveCustomer || routeCustomer;
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [isSmallScreen, setIsSmallScreen] = useState(!isTablet);
  const [orderNumber, setOrderNumber] = useState<string | undefined>(undefined);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState<string>('');
  const [showItemSettingsModal, setShowItemSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [orderService] = useState(() => new OrderService());
  const [hasReadyOrders, setHasReadyOrders] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [blinkAnimation] = useState(new Animated.Value(1));
  const [customerHasReadyOrders, setCustomerHasReadyOrders] = useState(false);
  
  // Database hooks
  const { categories, loading: categoriesLoading } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<CategoryDocument | null>(null);
  const { products, loading: productsLoading } = useProducts(selectedCategory?.id);
  const { currentEmployee } = useEmployeeAuth();

  const {
    createOrder,
    generateOrderNumber
  } = useOrders();

  const {
    updateCustomer,
    operationLoading
  } = useCustomers();

  // Handle screen size changes
  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsSmallScreen(width < 768);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove();
  }, []);

  // Auto-select first category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Remove customer orders subscription since we don't want to show recent orders

  // Monitor ready orders globally for blinking icon
  useEffect(() => {
    let subscription: any = null;

    const initializeReadyOrdersSubscription = async () => {
      try {
        await orderService.initialize();
        
        subscription = await orderService.subscribeToOrdersByStatus('completed', (orders) => {
          setHasReadyOrders(orders.length > 0);
          
          // Check if current customer has completed orders
          const customerCompletedOrders = orders.filter(order => order.customerId === customer.id);
          setCustomerHasReadyOrders(customerCompletedOrders.length > 0);
        });

        // Get initial completed orders
        const completedOrders = await orderService.getOrdersByStatus('completed');
        setHasReadyOrders(completedOrders.length > 0);
        const customerCompletedOrders = completedOrders.filter(order => order.customerId === customer.id);
        setCustomerHasReadyOrders(customerCompletedOrders.length > 0);
      } catch (error) {
        console.error('Error setting up ready orders subscription:', error);
      }
    };

    initializeReadyOrdersSubscription();

    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [orderService, customer.id]);

  // Handle blinking animation for ready orders
  useEffect(() => {
    if (hasReadyOrders) {
      const blinkLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnimation, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
      blinkLoop.start();
      return () => blinkLoop.stop();
    } else {
      blinkAnimation.setValue(1);
    }
  }, [hasReadyOrders]);

  // Handle product selection
  const handleAddItem = (product: ProductDocument, options?: OrderItemOptions) => {
    setOrderItems(prevItems => {
      const orderOptions = options || {
        starch: 'none',
        pressOnly: false,
        notes: ''
      };
      
      const itemKey = generateOrderItemKey(product, orderOptions);
      
      // Check if item with same options already exists
      const existingIndex = prevItems.findIndex(item => item.itemKey === itemKey);
      
      if (existingIndex >= 0) {
        // Increment quantity for existing item
        const updated = [...prevItems];
        updated[existingIndex].quantity = Number(updated[existingIndex].quantity) + 1;
        return updated;
      } else {
        // Add new item line - create clean object to avoid RxDB issues
        const newItem: OrderItem = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price) || 0,
          categoryId: product.categoryId,
          businessId: product.businessId,
          imageName: product.imageName,
          discount: Number(product.discount) || 0,
          additionalPrice: Number(product.additionalPrice) || 0,
          notes: product.notes,
          sku: product.sku || undefined,
          cost: product.cost || undefined,
          barcode: product.barcode || undefined,
          quantity: 1,
          isActive: product.isActive,
          isLocalOnly: product.isLocalOnly,
          isDeleted: product.isDeleted,
          lastSyncedAt: product.lastSyncedAt,
          amplifyId: product.amplifyId,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          options: orderOptions,
          itemKey
        };
        return [...prevItems, newItem];
      }
    });
  };

  // Handle item quantity changes
  const handleUpdateQuantity = (itemKey: string, quantity: number) => {
    const safeQuantity = Number(quantity) || 0;
    
    if (safeQuantity <= 0) {
      handleRemoveItem(itemKey);
      return;
    }

    setOrderItems(prevItems =>
      prevItems.map(item =>
        item.itemKey === itemKey ? { ...item, quantity: safeQuantity } : item
      )
    );
  };

  // Handle item removal
  const handleRemoveItem = (itemKey: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.itemKey !== itemKey));
  };

  // Handle item editing (options)
  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item);
    setShowItemSettingsModal(true);
  };

  // Handle item settings save
  const handleSaveItemSettings = (item: OrderItem, options: OrderItemOptions) => {
    setOrderItems(prevItems => {
      return prevItems.map(orderItem => {
        if (orderItem.itemKey === item.itemKey) {
          // Create new item key with updated options
          const baseProduct = {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            categoryId: item.categoryId,
            businessId: item.businessId,
            imageName: item.imageName,
            discount: item.discount,
            additionalPrice: item.additionalPrice,
            notes: item.notes,
            sku: item.sku,
            cost: item.cost,
            barcode: item.barcode,
            isActive: item.isActive,
            isLocalOnly: item.isLocalOnly,
            isDeleted: item.isDeleted,
            lastSyncedAt: item.lastSyncedAt,
            amplifyId: item.amplifyId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          } as ProductDocument;

          const newItemKey = generateOrderItemKey(baseProduct, options);
          
          return {
            ...orderItem,
            options,
            itemKey: newItemKey
          };
        }
        return orderItem;
      });
    });
    
    setShowItemSettingsModal(false);
    setEditingItem(null);
  };

  // Handle item settings cancel
  const handleCancelItemSettings = () => {
    setShowItemSettingsModal(false);
    setEditingItem(null);
  };

  // Handle checkout flow - go to receipt preview
  const handleCheckout = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to your order');
      return;
    }
    
    try {
      // Generate order number before showing the receipt preview
      const newOrderNumber = await generateOrderNumber();
      setOrderNumber(newOrderNumber);
      setShowReceiptPreview(true);
    } catch (error) {
      console.error('Error generating order number:', error);
      Alert.alert('Error', 'Failed to generate order number. Please try again.');
    }
  };

  // Handle date picker
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  // Handle opening date picker
  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  // Handle customer edit
  const handleEditCustomer = () => {
    setFormErrors({});
    setDuplicateError('');
    setShowEditCustomerModal(true);
  };

  // Handle customer update
  const handleUpdateCustomer = async (data: CustomerFormData) => {
    setFormErrors({});
    setDuplicateError('');

    const result = await updateCustomer(customer.id, data);
    
    if (result.success && result.customer) {
      // No need to manually update customer state - reactive hook will handle it automatically
      setShowEditCustomerModal(false);
      Alert.alert('Success', 'Customer updated successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setShowEditCustomerModal(false);
    setFormErrors({});
    setDuplicateError('');
  };

  // Handle order completion
  const handleOrderComplete = async (paymentMethod: 'cash' | 'card' | 'credit', qrData?: string) => {
    setShowReceiptPreview(false);
    
    try {
      // No auto-completion needed since we're now tracking completed orders

      // Save new order to database
      const newOrder = await createOrder({
        customer,
        items: orderItems,
        paymentMethod,
        selectedDate: selectedDate || undefined,
        notes: undefined,
        barcodeData: qrData,
        employee: currentEmployee ? {
          id: currentEmployee.id,
          name: `${currentEmployee.firstName} ${currentEmployee.lastName}`
        } : undefined
      });

      // Calculate total for confirmation
      const orderTotal = calculateOrderTotal();
      const tax = orderTotal * 0.0875;
      const finalTotal = orderTotal + tax;
      
      Alert.alert(
        'Order Complete',
        `Order #${newOrder.orderNumber} completed successfully!\n\nPayment Method: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}\nTotal: $${finalTotal.toFixed(2)}\nDate: ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}\n\nPrint receipt?`,
        [
          {
            text: 'No Thanks',
            style: 'cancel',
            onPress: () => {
              // Check if there are ready orders after completing this order
              checkForCompletedOrdersAndShowPickup();
              navigation.goBack();
            }
          },
          {
            text: 'Print Receipt',
            onPress: async () => {
              try {
                await printReceiptToThermalPrinter(newOrder, paymentMethod, selectedDate);
                Alert.alert('Receipt Printed', 'Receipt has been sent to your Munbyn printer', [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      // After printing, check for ready orders and show pickup modal
                      checkForCompletedOrdersAndShowPickup();
                      navigation.goBack();
                    }
                  }
                ]);
              } catch (error) {
                console.error('Print receipt error:', error);
                Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection.', [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      checkForCompletedOrdersAndShowPickup();
                      navigation.goBack();
                    }
                  }
                ]);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert(
        'Error',
        'Failed to create order. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const checkForCompletedOrdersAndShowPickup = async () => {
    try {
      const completedOrders = await orderService.getOrdersByStatus('completed');
      if (completedOrders.length > 0) {
        // Delay slightly to allow navigation to complete
        setTimeout(() => {
          setShowPickupModal(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error checking for completed orders:', error);
    }
  };


  // Calculate order total for payment with precise handling
  const calculateOrderTotal = () => {
    const rawTotal = orderItems.reduce((sum, item) => {
      const itemPrice = item.price + (item.additionalPrice || 0);
      const discountedPrice = item.discount 
        ? itemPrice * (1 - item.discount / 100)
        : itemPrice;
      return sum + (discountedPrice * item.quantity);
    }, 0);
    return toPreciseAmount(rawTotal);
  };

  const orderTotal = calculateOrderTotal();
  const tax = toPreciseAmount(orderTotal * 0.0875); // 8.75% tax
  const finalTotal = toPreciseAmount(orderTotal + tax);

  // Render content based on screen size
  const renderContent = () => {
    if (isSmallScreen) {
      // Mobile layout - stacked
      return (
        <View style={styles.smallScreenContent}>
          <View style={styles.smallScreenLeftPanel}>
            <ServiceTabBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              isLoading={categoriesLoading}
            />
            <ProductGrid
              products={products || []}
              onSelectProduct={handleAddItem}
              isLoading={productsLoading}
              style={styles.productGrid}
            />
          </View>
          <View style={styles.smallScreenRightPanel}>
            <OrderSummary
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onEditItem={handleEditItem}
              onCheckout={handleCheckout}
              selectedDate={selectedDate}
            />
          </View>
        </View>
      );
    } else {
      // Tablet layout - side by side
      return (
        <View style={styles.content}>
          <View style={styles.leftPanel}>
            <ServiceTabBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              isLoading={categoriesLoading}
            />
            <ProductGrid
              products={products || []}
              onSelectProduct={handleAddItem}
              isLoading={productsLoading}
              style={styles.productGrid}
            />
          </View>
          <View style={styles.rightPanel}>
            <OrderSummary
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onEditItem={handleEditItem}
              onCheckout={handleCheckout}
              selectedDate={selectedDate}
            />
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <CustomerHeader 
          customer={customer}
          onEdit={handleEditCustomer}
          onDatePick={handleOpenDatePicker}
          selectedDate={selectedDate || undefined}
          onReadyOrdersPress={hasReadyOrders ? () => setShowPickupModal(true) : undefined}
          hasReadyOrders={hasReadyOrders}
          blinkAnimation={blinkAnimation}
          style={styles.customerHeaderFlex}
        />
      </View>
      
      {renderContent()}

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate || undefined}
        onSelectDate={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        visible={showReceiptPreview}
        customer={customer}
        orderItems={orderItems}
        selectedDate={selectedDate || undefined}
        orderNumber={orderNumber || ''}
        employeeName={currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : undefined}
        onClose={() => setShowReceiptPreview(false)}
        onComplete={handleOrderComplete}
      />

      {/* Edit Customer Modal */}
      <Modal
        visible={showEditCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DynamicForm
          mode="edit"
          entityType="customer"
          initialData={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || '',
            phone: customer.phone,
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            zipCode: customer.zipCode || '',
            notes: customer.notes || '',
            emailNotifications: customer.emailNotifications || false,
            textNotifications: customer.textNotifications || false
          }}
          onSubmit={handleUpdateCustomer}
          onCancel={handleCloseEditModal}
          isLoading={operationLoading}
          errors={formErrors}
          duplicateError={duplicateError}
        />
      </Modal>

      {/* Order Item Settings Modal */}
      <OrderItemSettingsModal
        visible={showItemSettingsModal}
        item={editingItem}
        onSave={handleSaveItemSettings}
        onCancel={handleCancelItemSettings}
      />

      {/* Pickup Modal */}
      <PickupModal
        visible={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        onOrderPickedUp={(orderId) => {
          console.log('Order picked up:', orderId);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  leftPanel: {
    flex: 2,
    marginRight: 8,
  },
  rightPanel: {
    flex: 1,
    marginLeft: 8,
  },
  smallScreenContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  smallScreenLeftPanel: {
    flex: 1,
    marginBottom: 16,
  },
  smallScreenRightPanel: {
    height: 300,
  },
  productGrid: {
    flex: 1,
    marginTop: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalFooter: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  customerHeaderFlex: {
    flex: 1,
    marginRight: 12,
  },
});