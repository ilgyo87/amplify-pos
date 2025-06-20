import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem, OrderSummaryData, starchShortCode, TAX_RATE } from '../../types/order';
import { toPreciseAmount } from '../../utils/monetaryUtils';

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemKey: string, quantity: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onEditItem: (item: OrderItem) => void;
  onCheckout: () => void;
  selectedDate?: string;
  style?: any;
  disabled?: boolean;
}

export function OrderSummary({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onCheckout,
  selectedDate,
  style,
  disabled = false
}: OrderSummaryProps) {
  const calculateSummary = (): OrderSummaryData => {
    const rawSubtotal = items.reduce((sum, item) => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      // Calculate add-ons price
      const addOnsPrice = item.addOns?.reduce((addOnSum, addOn) => {
        return addOnSum + (addOn.price * addOn.quantity);
      }, 0) || 0;
      
      const totalItemPrice = itemPrice + addOnsPrice;
      
      const discountedPrice = discount > 0 
        ? totalItemPrice * (1 - discount / 100)
        : totalItemPrice;
      return sum + (discountedPrice * quantity);
    }, 0);

    const subtotal = toPreciseAmount(rawSubtotal);
    const tax = toPreciseAmount(subtotal * TAX_RATE);
    const total = toPreciseAmount(subtotal + tax);
    const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return {
      subtotal,
      tax,
      total,
      itemCount
    };
  };

  const summary = calculateSummary();

  const handleQuantityChange = (itemKey: string, change: number) => {
    const item = items.find(i => i.itemKey === itemKey);
    if (!item) return;

    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from the order?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onRemoveItem(itemKey) }
        ]
      );
      return;
    }

    onUpdateQuantity(itemKey, newQuantity);
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => {
    const basePrice = Number(item.price) || 0;
    const additionalPrice = Number(item.additionalPrice) || 0;
    const itemPrice = basePrice + additionalPrice;
    const discount = Number(item.discount) || 0;
    const quantity = Number(item.quantity) || 0;
    
    // Calculate add-ons price
    const addOnsPrice = item.addOns?.reduce((sum, addOn) => {
      return sum + (addOn.price * addOn.quantity);
    }, 0) || 0;
    
    const totalItemPrice = itemPrice + addOnsPrice;
    
    const discountedPrice = discount > 0 
      ? totalItemPrice * (1 - discount / 100)
      : totalItemPrice;
    const totalPrice = toPreciseAmount(discountedPrice * quantity);

    return (
      <View style={styles.orderItem}>
        {/* Top row: Name + Action Buttons */}
        <View style={styles.topRow}>
          <View style={styles.itemNameContainer}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            {/* Display add-ons underneath item name */}
            {item.addOns && item.addOns.length > 0 && (
              <View style={styles.addOnsContainer}>
                {item.addOns.map((addOn, index) => (
                  <Text key={index} style={styles.addOnText}>
                    + {addOn.name} {addOn.quantity > 1 ? `(${addOn.quantity}x)` : ''} - ${(addOn.price * addOn.quantity).toFixed(2)}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            {/* Item options display next to settings button */}
            {(item.options?.starch !== 'none' || item.options?.pressOnly || item.options?.notes) && (
              <View style={styles.optionsContainer}>
                {item.options?.starch && item.options.starch !== 'none' && (
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>
                      {starchShortCode(item.options.starch)}
                    </Text>
                  </View>
                )}
                {item.options?.pressOnly && (
                  <View style={[styles.optionBadge, styles.pressOnlyBadge]}>
                    <Text style={styles.optionBadgeText}>PO</Text>
                  </View>
                )}
                {item.options?.notes && item.options.notes.trim() && (
                  <View style={[styles.optionBadge, styles.notesBadge]}>
                    <Ionicons name="document-text" size={10} color="#666" />
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => onEditItem(item)}
            >
              <Ionicons name="settings-outline" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => onRemoveItem(item.itemKey)}
            >
              <Ionicons name="close" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom row: Quantity Controls + Total Price */}
        <View style={styles.bottomRow}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.itemKey, -1)}
            >
              <Ionicons name="remove" size={14} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={styles.quantity}>{quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.itemKey, 1)}
            >
              <Ionicons name="add" size={14} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTotal}>${totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No items in order</Text>
      <Text style={styles.emptySubtext}>Select products to add to the order</Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Summary</Text>
        {items.length > 0 && (
          <Text style={styles.itemCount}>
            {summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        {items.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={items}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.itemKey}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        )}
      </View>

      {items.length > 0 && (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>${summary.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({(TAX_RATE * 100).toFixed(2)}%):</Text>
              <Text style={styles.summaryValue}>${summary.tax.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${summary.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Complete Button with validation */}
          <View style={styles.buttonContainer}>
            {(!selectedDate || items.length === 0) && (
              <View style={styles.validationMessage}>
                <Ionicons name="information-circle-outline" size={16} color="#ff6b35" />
                <Text style={styles.validationText}>
                  {!selectedDate && items.length > 0 ? 'Please select a pickup date' : 
                   items.length === 0 ? 'Please add items to order' : 
                   'Date and items required'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[
                styles.checkoutButton,
                (disabled || !selectedDate || items.length === 0) && styles.checkoutButtonDisabled
              ]} 
              onPress={onCheckout}
              disabled={disabled || !selectedDate || items.length === 0}
            >
              <Text style={[
                styles.checkoutButtonText,
                (disabled || !selectedDate || items.length === 0) && styles.checkoutButtonTextDisabled
              ]}>
                Complete
              </Text>
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color={(disabled || !selectedDate || items.length === 0) ? "#ccc" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingBottom: 16,  // Add bottom padding to prevent cutoff
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 12,  // Increased vertical padding
    paddingBottom: 24,  // Extra bottom padding for better scrolling
  },
  // Item styles
  orderItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,  // Increased vertical padding
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNameContainer: {
    flex: 1,
    marginRight: 12,  // Increased right margin
  },
  itemName: {
    fontSize: 15,  // Slightly larger font
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,  // Increased bottom margin
  },
  optionText: {
    color: '#666',
    fontWeight: '400',
    fontSize: 13,  // Slightly smaller for options
  },
  unitPrice: {
    fontSize: 13,  // Slightly larger
    color: '#666',
    marginTop: 2,  // Add some space between name and price
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Quantity controls
  quantityButton: {
    width: 28,  // Slightly larger buttons
    height: 28,
    borderRadius: 14,  // Match new height/2
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  quantity: {
    fontSize: 15,  // Slightly larger
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,  // Increased horizontal margin
    minWidth: 20,  // Ensure consistent width
    textAlign: 'center',
  },
  
  // Item actions
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 6,
    marginRight: 6,
  },
  removeButton: {
    padding: 6,
  },
  itemTotal: {
    fontSize: 16,  // Larger for better visibility on bottom row
    fontWeight: '700',
    color: '#007AFF',
  },
  itemNotes: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 4,
  },
  itemSeparator: {
    height: 0.5,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  
  // Summary section
  summaryContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  
  // Button container and validation
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff5f2',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffd4cc',
  },
  validationText: {
    fontSize: 14,
    color: '#ff6b35',
    marginLeft: 6,
    fontWeight: '500',
  },
  
  // Checkout button
  checkoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  checkoutButtonTextDisabled: {
    color: '#ccc',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  optionBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9e6',
  },
  pressOnlyBadge: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  notesBadge: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    paddingHorizontal: 4,
  },
  optionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  addOnsContainer: {
    marginTop: 4,
    paddingLeft: 8,
  },
  addOnText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
});