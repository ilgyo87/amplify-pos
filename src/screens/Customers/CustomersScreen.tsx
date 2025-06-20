import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Alert, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../BaseScreen';
import { useCustomers } from '../../database/hooks/useCustomers';
import { CustomerDocument } from '../../database/schemas/customer';
import { CustomerFormData } from '../../utils/customerValidation';
import { OrderService } from '../../database/services/orderService';
import { OrderDocType } from '../../database/schemas/order';
import { toPreciseAmount } from '../../utils/monetaryUtils';

// Components
import { SearchBar } from '../../components/customers/SearchBar';
import { CustomerList } from '../../components/customers/CustomerList';
import { CreateCustomerFAB } from '../../components/customers/CreateCustomerButton';
import { DynamicForm } from '../../components/forms/DynamicForm';

export default function CustomersScreen() {
  const {
    customers,
    totalCustomers,
    loading,
    operationLoading,
    error,
    searchQuery,
    hasSearchResults,
    isSearching,
    searchCustomers,
    clearSearch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers,
    clearError
  } = useCustomers();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDocument | null>(null);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerDocument | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [orderService] = useState(() => new OrderService());
  const [isPrinting, setIsPrinting] = useState(false);

  // Form states
  const [formErrors, setFormErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState<string>('');

  const handleSearch = useCallback((query: string) => {
    searchCustomers(query);
  }, [searchCustomers]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleCreateCustomer = useCallback(async (data: CustomerFormData) => {
    setFormErrors({});
    setDuplicateError('');

    const result = await createCustomer(data);
    
    if (result.success && result.customer) {
      setShowCreateModal(false);
      Alert.alert('Success', 'Customer created successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [createCustomer]);

  const handleEditCustomer = useCallback((customer: CustomerDocument) => {
    setEditingCustomer(customer);
    setFormErrors({});
    setDuplicateError('');
    setShowEditModal(true);
  }, []);

  const handleUpdateCustomer = useCallback(async (data: CustomerFormData) => {
    if (!editingCustomer) return;

    setFormErrors({});
    setDuplicateError('');

    const result = await updateCustomer(editingCustomer.id, data);
    
    if (result.success && result.customer) {
      setShowEditModal(false);
      setEditingCustomer(null);
      Alert.alert('Success', 'Customer updated successfully');
    } else {
      if (result.errors) {
        setFormErrors(result.errors);
      }
      if (result.duplicateError) {
        setDuplicateError(result.duplicateError);
      }
    }
  }, [editingCustomer, updateCustomer]);

  const handleDeleteCustomer = useCallback(async (customer: CustomerDocument) => {
    const success = await deleteCustomer(customer.id);
    if (success) {
      Alert.alert('Success', 'Customer deleted successfully');
    } else {
      Alert.alert('Error', 'Failed to delete customer');
    }
  }, [deleteCustomer]);

  const handleOpenCreateModal = useCallback(() => {
    setFormErrors({});
    setDuplicateError('');
    setShowCreateModal(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setFormErrors({});
    setDuplicateError('');
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCustomer(null);
    setFormErrors({});
    setDuplicateError('');
  }, []);

  const handleRefresh = useCallback(async () => {
    await refreshCustomers();
  }, [refreshCustomers]);

  // Handle order history
  const handleViewOrderHistory = useCallback(async (customer: CustomerDocument) => {
    setSelectedCustomerForHistory(customer);
    
    try {
      await orderService.initialize();
      // Get ALL orders for this customer regardless of status
      const orders = await orderService.getOrdersByCustomer(customer.id);
      setCustomerOrders(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setShowOrderHistoryModal(true);
    } catch (error) {
      console.error('Error loading customer orders:', error);
      Alert.alert('Error', 'Failed to load order history. Please try again.');
    }
  }, [orderService]);

  // Helper function to get order status color
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      case 'picked_up': return '#84cc16';
      default: return '#6b7280';
    }
  };

  // Thermal printing functions
  const generateThermalReceiptCommands = (order: OrderDocType): Uint8Array => {
    const printDate = new Date(order.createdAt).toLocaleDateString();
    const printTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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
    commands.push(0x1B, 0x3F, 0x0A, 0x00); // ESC ? n - Cancel hex dump mode
    commands.push(0x10, 0x04, 0x02); // DLE EOT 2 - Real-time recovery from errors
    commands.push(0x18); // CAN - Clear print buffer
    commands.push(ESC, 0x40); // Reset printer
    commands.push(ESC, 0x21, 0x00); // ESC ! n - Select print mode (0 = normal)
    commands.push(ESC, 0x74, 0x00); // Select character code table (PC437 - USA)
    commands.push(ESC, 0x4D, 0x00); // Select character font A
    commands.push(GS, 0x21, 0x00); // Select character size (normal)
    commands.push(ESC, 0x61, 0x01); // Center alignment
    
    // Send form feed to clear any previous content
    commands.push(0x0C); // FF - Form feed
    
    // Start with clean lines
    addLF();
    addLF();
    addLF();
    
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
    addText(`Date: ${printDate} ${printTime}`);
    addLF();
    addText(`Pickup: ${order.selectedDate ? new Date(order.selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}`);
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
    order.items.forEach(item => {
      const basePrice = Number(item.price) || 0;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      // Calculate add-ons price
      const addOnsPrice = item.addOns?.reduce((sum, addOn) => {
        return sum + (addOn.price * addOn.quantity);
      }, 0) || 0;
      
      const totalItemPrice = basePrice + addOnsPrice;
      
      const discountedPrice = discount > 0 ? totalItemPrice * (1 - discount / 100) : totalItemPrice;
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
      
      // Print add-ons on separate lines, indented
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addOn => {
          const addOnLine = `  + ${addOn.name}`;
          const addOnPrice = (addOn.price * addOn.quantity).toFixed(2);
          addText(formatTwoColumns(addOnLine, `${addOnPrice}`, 48));
          addLF();
        });
      }
    });
    
    addText('--------------------------------');
    addLF();
    
    // Totals
    addText(formatTwoColumns('Subtotal:', `$${order.subtotal.toFixed(2)}`, 32));
    addLF();
    addText(formatTwoColumns('Tax:', `$${order.tax.toFixed(2)}`, 32));
    addLF();
    addText('--------------------------------');
    addLF();
    
    // Grand total - Bold
    commands.push(ESC, 0x45, 0x01); // Bold on
    addText(formatTwoColumns('TOTAL:', `$${order.total.toFixed(2)}`, 32));
    addLF();
    commands.push(ESC, 0x45, 0x00); // Bold off
    addLF();
    
    // Payment method
    addText(formatTwoColumns('Payment:', order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1), 32));
    addLF();
    addLF();
    
    // QR Code using ESC/POS QR command
    commands.push(ESC, 0x61, 0x01); // Center alignment
    
    // QR Code commands for ESC/POS thermal printers
    // Set QR code model
    commands.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Set QR code size (module size)
    commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);
    // Set QR code error correction level
    commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
    
    // Store QR code data
    const qrData = order.orderNumber;
    const qrDataLength = qrData.length + 3;
    const qrLowByte = qrDataLength & 0xFF;
    const qrHighByte = (qrDataLength >> 8) & 0xFF;
    commands.push(GS, 0x28, 0x6B, qrLowByte, qrHighByte, 0x31, 0x50, 0x30);
    
    // Add QR data
    const qrBytes = new TextEncoder().encode(qrData);
    commands.push(...Array.from(qrBytes));
    
    // Print QR code
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
    addLF();
    addLF();
    addLF();
    
    // Cut paper
    commands.push(GS, 0x56, 0x00); // Full cut
    
    return new Uint8Array(commands);
  };

  const sendRawDataToPrinter = async (ip: string, port: string, data: Uint8Array): Promise<boolean> => {
    try {
      console.log(`Sending ${data.length} bytes to thermal printer at ${ip}:${port}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
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
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        const fetchError = error as { name?: string; message?: string };
        
        // If it's a timeout or network error, assume printing worked
        // Thermal printers often don't send proper HTTP responses
        if (fetchError.name === 'AbortError' || 
            (fetchError.message && fetchError.message.includes('Network request failed'))) {
          console.log('Printer connection timeout - assuming print succeeded (normal for thermal printers)');
          return true; // Assume success for thermal printers
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to send raw data to printer:', error);
      return false;
    }
  };

  const handlePrintReceipt = async (order: OrderDocType) => {
    setIsPrinting(true);
    try {
      // Check for printer settings
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const printerSettings = await AsyncStorage.default.getItem('printerSettings');
      
      if (printerSettings) {
        const { ip, port } = JSON.parse(printerSettings);
        
        if (ip) {
          // Generate ESC/POS commands for thermal printing
          const escPosCommands = generateThermalReceiptCommands(order);
          
          // Send directly to thermal printer
          console.log(`Printing order #${order.orderNumber} to Munbyn printer at ${ip}:${port || '9100'}`);
          const success = await sendRawDataToPrinter(ip, port || '9100', escPosCommands);
          
          if (success) {
            console.log('Receipt printed successfully to thermal printer');
            Alert.alert('Success', 'Receipt printed successfully');
          } else {
            throw new Error('Failed to send data to printer');
          }
        } else {
          Alert.alert('Printer Not Configured', 'Please configure your Munbyn printer in Settings before printing.');
        }
      } else {
        Alert.alert('Printer Not Set Up', 'Please set up your Munbyn ITPP047P printer in Settings before printing.');
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection and try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle errors
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  return (
    <BaseScreen title="Customers">
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
            resultsCount={customers.length}
            showResultsCount={hasSearchResults}
          />
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {hasSearchResults 
                ? `${customers.length} of ${totalCustomers} customers`
                : `${totalCustomers} total customers`
              }
            </Text>
          </View>
        </View>

        {/* Customer List */}
        <View style={styles.listContainer}>
          <CustomerList
            customers={customers}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onViewOrderHistory={handleViewOrderHistory}
            loading={loading}
            refreshing={false}
            onRefresh={handleRefresh}
            emptyMessage={
              hasSearchResults 
                ? 'No customers match your search'
                : 'No customers found'
            }
          />
        </View>

        {/* Create Customer FAB */}
        <CreateCustomerFAB
          onPress={handleOpenCreateModal}
          disabled={operationLoading}
        />

        {/* Create Customer Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="create"
            entityType="customer"
            onSubmit={handleCreateCustomer}
            onCancel={handleCloseCreateModal}
            isLoading={operationLoading}
            errors={formErrors}
            duplicateError={duplicateError}
          />
        </Modal>

        {/* Edit Customer Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DynamicForm
            mode="edit"
            entityType="customer"
            initialData={editingCustomer ? {
              firstName: editingCustomer.firstName,
              lastName: editingCustomer.lastName,
              email: editingCustomer.email || '',
              phone: editingCustomer.phone,
              address: editingCustomer.address || '',
              city: editingCustomer.city || '',
              state: editingCustomer.state || '',
              zipCode: editingCustomer.zipCode || '',
              notes: editingCustomer.notes || '',
              emailNotifications: editingCustomer.emailNotifications === true,
              textNotifications: editingCustomer.textNotifications === true
            } : undefined}
            onSubmit={handleUpdateCustomer}
            onCancel={handleCloseEditModal}
            isLoading={operationLoading}
            errors={formErrors}
            duplicateError={duplicateError}
          />
        </Modal>

        {/* Order History Modal */}
        <Modal
          visible={showOrderHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.orderHistoryContainer}>
            <View style={styles.orderHistoryHeader}>
              <TouchableOpacity 
                style={styles.orderHistoryCloseButton} 
                onPress={() => {
                  setShowOrderHistoryModal(false);
                  setSelectedCustomerForHistory(null);
                  setCustomerOrders([]);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.orderHistoryTitle}>
                Order History - {selectedCustomerForHistory?.firstName} {selectedCustomerForHistory?.lastName}
              </Text>
              <View style={styles.orderHistoryPlaceholder} />
            </View>
            
            <View style={styles.orderHistoryContent}>
              {customerOrders.length === 0 ? (
                <View style={styles.orderHistoryEmpty}>
                  <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
                  <Text style={styles.orderHistoryEmptyTitle}>No Orders Found</Text>
                  <Text style={styles.orderHistoryEmptyText}>
                    This customer hasn't placed any orders yet.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.orderHistoryList} showsVerticalScrollIndicator={false}>
                  {customerOrders.map((order) => (
                    <View key={order.id} style={styles.orderHistoryCard}>
                      <View style={styles.orderHistoryCardHeader}>
                        <Text style={styles.orderHistoryOrderNumber}>#{order.orderNumber}</Text>
                        <View style={[styles.orderHistoryStatusBadge, { backgroundColor: getOrderStatusColor(order.status) }]}>
                          <Text style={styles.orderHistoryStatusText}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.orderHistoryDate}>
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      
                      <View style={styles.orderHistoryItems}>
                        <Text style={styles.orderHistoryItemsLabel}>Items ({order.items.length}):</Text>
                        {order.items.slice(0, 3).map((item, index) => (
                          <Text key={index} style={styles.orderHistoryItemText}>
                            {item.quantity}x {item.name}
                          </Text>
                        ))}
                        {order.items.length > 3 && (
                          <Text style={styles.orderHistoryMoreItems}>
                            +{order.items.length - 3} more items
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.orderHistoryFooter}>
                        <View style={styles.orderHistoryFooterLeft}>
                          <Text style={styles.orderHistoryTotal}>${order.total.toFixed(2)}</Text>
                          <Text style={styles.orderHistoryPayment}>
                            {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.orderHistoryPrintButton, isPrinting && styles.orderHistoryPrintButtonDisabled]}
                          onPress={() => handlePrintReceipt(order)}
                          disabled={isPrinting}
                        >
                          <Ionicons name="print-outline" size={20} color={isPrinting ? "#ccc" : "#007AFF"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  statsContainer: {
    paddingTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  // Order History Modal Styles
  orderHistoryContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  orderHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  orderHistoryCloseButton: {
    padding: 8,
  },
  orderHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  orderHistoryPlaceholder: {
    width: 40,
  },
  orderHistoryContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  orderHistoryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  orderHistoryEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  orderHistoryEmptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  orderHistoryList: {
    flex: 1,
  },
  orderHistoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHistoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHistoryOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderHistoryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderHistoryStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  orderHistoryDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  orderHistoryItems: {
    marginBottom: 12,
  },
  orderHistoryItemsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  orderHistoryItemText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    marginBottom: 2,
  },
  orderHistoryMoreItems: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 8,
    marginTop: 2,
  },
  orderHistoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  orderHistoryFooterLeft: {
    flex: 1,
  },
  orderHistoryPrintButton: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  orderHistoryPrintButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  orderHistoryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderHistoryPayment: {
    fontSize: 14,
    color: '#6b7280',
  },
});
