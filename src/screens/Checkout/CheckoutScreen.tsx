import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BaseScreen } from '../BaseScreen';
import { CustomerHeader } from '../../components/checkout/CustomerHeader';
import { ServiceTabBar } from '../../components/checkout/ServiceTabBar';
import { ProductGrid } from '../../components/checkout/ProductGrid';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { PickupCalendar } from '../../components/checkout/PickupCalendar';
import { PaymentModal } from '../../components/checkout/PaymentModal';
import { useCategories } from '../../database/hooks/useCategories';
import { useProducts } from '../../database/hooks/useProducts';
import { SerializableCustomer } from '../../navigation/types';
import { CategoryDocument } from '../../database/schemas/category';
import { ProductDocument } from '../../database/schemas/product';
import { OrderItem, OrderItemOptions, generateOrderItemKey, PaymentInfo } from '../../types/order';
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
  const [showPickupCalendar, setShowPickupCalendar] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
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

  // Handle checkout flow
  const handleCheckout = () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to your order');
      return;
    }
    setShowPickupCalendar(true);
  };

  // Handle pickup date/time selection
  const handlePickupComplete = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select pickup date and time');
      return;
    }
    setShowPickupCalendar(false);
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePaymentComplete = (paymentInfo: PaymentInfo) => {
    setShowPaymentModal(false);
    
    // TODO: Save order to database and process payment
    Alert.alert(
      'Order Complete',
      `Order has been placed successfully!\n\nPickup: ${selectedDate} at ${selectedTime}\nTotal: $${paymentInfo.amount.toFixed(2)}`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
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
            />
          </View>
        </View>
      );
    }
  };

  return (
    <BaseScreen 
      title={`Checkout - ${customer.firstName} ${customer.lastName}`}
      showBackButton
    >
      <View style={styles.container}>
        <CustomerHeader 
          customer={customer}
          onEdit={() => {
            // TODO: Navigate to customer edit screen
            Alert.alert('Edit Customer', 'Customer editing will be implemented');
          }}
        />
        
        {renderContent()}

        {/* Pickup Calendar Modal */}
        <Modal
          visible={showPickupCalendar}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPickupCalendar(false)}
        >
          <View style={styles.modalContainer}>
            <PickupCalendar
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
            />
            
            {selectedDate && selectedTime && (
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.continueButton}
                  onPress={handlePickupComplete}
                >
                  <Text style={styles.continueButtonText}>Continue to Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>

        {/* Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          orderTotal={finalTotal}
          onClose={() => setShowPaymentModal(false)}
          onCompletePayment={handlePaymentComplete}
        />
      </View>
    </BaseScreen>
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