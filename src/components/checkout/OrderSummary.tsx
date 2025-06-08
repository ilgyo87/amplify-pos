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

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateQuantity: (itemKey: string, quantity: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onEditItem: (item: OrderItem) => void;
  onCheckout: () => void;
  style?: any;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onCheckout,
  style
}) => {
  const calculateSummary = (): OrderSummaryData => {
    const subtotal = items.reduce((sum, item) => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      const discountedPrice = discount > 0 
        ? itemPrice * (1 - discount / 100)
        : itemPrice;
      return sum + (discountedPrice * quantity);
    }, 0);

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return {
      subtotal: Number(subtotal) || 0,
      tax: Number(tax) || 0,
      total: Number(total) || 0,
      itemCount: Number(itemCount) || 0
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
    
    const discountedPrice = discount > 0 
      ? itemPrice * (1 - discount / 100)
      : itemPrice;
    const totalPrice = discountedPrice * quantity;

    return (
      <View style={styles.orderItem}>
        <View style={styles.itemRow}>
          {/* Left side: Name + Options */}
          <View style={styles.itemNameContainer}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
              {item.options?.starch && item.options.starch !== 'none' && (
                <Text style={styles.optionText}>
                  {' '}({starchShortCode(item.options.starch)})
                </Text>
              )}
              {item.options?.pressOnly && (
                <Text style={styles.optionText}> PO</Text>
              )}
            </Text>
            <Text style={styles.unitPrice}>${itemPrice.toFixed(2)}</Text>
          </View>

          {/* Center: Quantity Controls */}
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

          {/* Right side: Total + Actions */}
          <View style={styles.itemActions}>
            <Text style={styles.itemTotal}>${totalPrice.toFixed(2)}</Text>
            <View style={styles.actionButtons}>
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
        </View>

        {/* Notes on separate line only if they exist */}
        {(item.options?.notes || item.notes) && (
          <Text style={styles.itemNotes}>
            {item.options?.notes || item.notes}
          </Text>
        )}
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

          <TouchableOpacity style={styles.checkoutButton} onPress={onCheckout}>
            <Text style={styles.checkoutButtonText}>Continue to Pickup & Payment</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

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
    paddingVertical: 8,
  },
  orderItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionText: {
    color: '#666',
    fontWeight: '400',
  },
  unitPrice: {
    fontSize: 11,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 4,
    marginRight: 4,
  },
  removeButton: {
    padding: 4,
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
  checkoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});