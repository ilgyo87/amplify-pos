import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductDocument } from '../../database/schemas/product';
import { OrderItemOptions } from '../../types/order';
import { useProducts } from '../../database/hooks/useProducts';

interface AddOnItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AddOnsModalProps {
  visible: boolean;
  product: ProductDocument | null;
  onConfirm: (product: ProductDocument, options: OrderItemOptions, addOns: AddOnItem[]) => void;
  onCancel: () => void;
}

export function AddOnsModal({ visible, product, onConfirm, onCancel }: AddOnsModalProps) {
  const [options, setOptions] = useState<OrderItemOptions>({
    starch: 'none',
    pressOnly: false,
    notes: ''
  });
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnItem[]>([]);
  
  // Get add-on products
  const { products: allProducts } = useProducts();
  const addOnProducts = allProducts.filter(p => p.categoryName === 'Add-ons');

  // Reset when modal opens with new product
  useEffect(() => {
    if (visible) {
      setOptions({
        starch: 'none',
        pressOnly: false,
        notes: ''
      });
      setSelectedAddOns([]);
    }
  }, [visible, product]);

  const handleToggleAddOn = (addOnProduct: ProductDocument) => {
    setSelectedAddOns(prev => {
      const existing = prev.find(a => a.id === addOnProduct.id);
      if (existing) {
        // Remove if already selected
        return prev.filter(a => a.id !== addOnProduct.id);
      } else {
        // Add new add-on
        return [...prev, {
          id: addOnProduct.id,
          name: addOnProduct.name,
          price: addOnProduct.price,
          quantity: 1
        }];
      }
    });
  };

  const handleUpdateAddOnQuantity = (addOnId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAddOns(prev => prev.filter(a => a.id !== addOnId));
    } else {
      setSelectedAddOns(prev =>
        prev.map(a => a.id === addOnId ? { ...a, quantity } : a)
      );
    }
  };

  const calculateTotal = () => {
    if (!product) return 0;
    
    const basePrice = product.price;
    const addOnsTotal = selectedAddOns.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
    
    return basePrice + addOnsTotal;
  };

  const handleConfirm = () => {
    if (product) {
      onConfirm(product, options, selectedAddOns);
    }
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{product.name}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Service Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Options</Text>
              
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Starch</Text>
                <View style={styles.starchOptions}>
                  {(['none', 'light', 'medium', 'heavy'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.starchButton,
                        options.starch === level && styles.starchButtonActive
                      ]}
                      onPress={() => setOptions(prev => ({ ...prev, starch: level }))}
                    >
                      <Text style={[
                        styles.starchButtonText,
                        options.starch === level && styles.starchButtonTextActive
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setOptions(prev => ({ ...prev, pressOnly: !prev.pressOnly }))}
              >
                <Text style={styles.optionLabel}>Press Only</Text>
                <View style={[styles.checkbox, options.pressOnly && styles.checkboxActive]}>
                  {options.pressOnly && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Add-ons */}
            {addOnProducts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add-on Services</Text>
                {addOnProducts.map(addon => {
                  const selected = selectedAddOns.find(a => a.id === addon.id);
                  return (
                    <TouchableOpacity
                      key={addon.id}
                      style={styles.addOnRow}
                      onPress={() => handleToggleAddOn(addon)}
                    >
                      <View style={styles.addOnInfo}>
                        <Text style={styles.addOnName}>{addon.name}</Text>
                        <Text style={styles.addOnPrice}>+${addon.price.toFixed(2)}</Text>
                      </View>
                      {selected ? (
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleUpdateAddOnQuantity(addon.id, selected.quantity - 1)}
                          >
                            <Ionicons name="remove" size={20} color="#007AFF" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{selected.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleUpdateAddOnQuantity(addon.id, selected.quantity + 1)}
                          >
                            <Ionicons name="add" size={20} color="#007AFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[styles.checkbox]}>
                          <Ionicons name="add" size={16} color="#007AFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Add to Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
  },
  starchOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  starchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  starchButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  starchButtonText: {
    fontSize: 14,
    color: '#666',
  },
  starchButtonTextActive: {
    color: 'white',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  addOnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  addOnInfo: {
    flex: 1,
  },
  addOnName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  addOnPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});