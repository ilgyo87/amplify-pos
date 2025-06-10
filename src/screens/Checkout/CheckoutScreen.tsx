import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
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
import { SerializableCustomer } from '../../navigation/types';
import { CategoryDocument } from '../../database/schemas/category';
import { ProductDocument } from '../../database/schemas/product';
import { OrderItem, OrderItemOptions, generateOrderItemKey } from '../../types/order';
import { RootStackParamList } from '../../navigation/types';

type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;
type CheckoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

interface CheckoutScreenProps {
  route: CheckoutScreenRouteProp;
  navigation: CheckoutScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function CheckoutScreen({ route, navigation }: CheckoutScreenProps) {
  const { customer } = route.params;
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<CategoryDocument | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Layout state for responsive design
  const [isSmallScreen, setIsSmallScreen] = useState(!isTablet);

  // Database hooks
  const {
    categories,
    loading: categoriesLoading,
  } = useCategories();

  const {
    products,
    loading: productsLoading,
  } = useProducts(selectedCategory?.id);

  const {
    createOrder
  } = useOrders();

  // Handle screen size changes
  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsSmallScreen(width < 768);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove();
  }, []);

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
          sku: product.sku,
          cost: product.cost,
          barcode: product.barcode,
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
    // TODO: Implement options modal
    Alert.alert(
      'Edit Item Options',
      'Options editing modal will be implemented here',
      [{ text: 'OK' }]
    );
  };

  // Handle checkout flow - go to receipt preview
  const handleCheckout = () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to your order');
      return;
    }
    setShowReceiptPreview(true);
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
    Alert.alert('Edit Customer', 'Customer editing will be implemented');
  };

  // Handle order completion
  const handleOrderComplete = async (paymentMethod: 'cash' | 'card' | 'credit', qrData?: string) => {
    setShowReceiptPreview(false);
    
    try {
      // Save order to database
      const newOrder = await createOrder({
        customer,
        items: orderItems,
        paymentMethod,
        selectedDate: selectedDate || undefined,
        notes: undefined,
        barcodeData: qrData
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
            onPress: () => navigation.goBack()
          },
          {
            text: 'Print Receipt',
            onPress: () => {
              // TODO: Implement receipt printing
              Alert.alert('Receipt Printed', 'Receipt has been sent to printer', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
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

  // Calculate order total for payment
  const calculateOrderTotal = () => {
    return orderItems.reduce((sum, item) => {
      const itemPrice = item.price + (item.additionalPrice || 0);
      const discountedPrice = item.discount 
        ? itemPrice * (1 - item.discount / 100)
        : itemPrice;
      return sum + (discountedPrice * item.quantity);
    }, 0);
  };

  const orderTotal = calculateOrderTotal();
  const tax = orderTotal * 0.0875; // 8.75% tax
  const finalTotal = orderTotal + tax;

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
              currentPage={currentPage}
              onChangePage={setCurrentPage}
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
              currentPage={currentPage}
              onChangePage={setCurrentPage}
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
      <CustomerHeader 
        customer={customer}
        onEdit={handleEditCustomer}
        onDatePick={handleOpenDatePicker}
        selectedDate={selectedDate || undefined}
      />
      
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
        onClose={() => setShowReceiptPreview(false)}
        onComplete={handleOrderComplete}
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
});