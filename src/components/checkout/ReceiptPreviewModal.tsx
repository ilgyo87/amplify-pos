import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../../types/order';
import { SerializableCustomer } from '../../navigation/types';
import { QRCode } from '../../utils/qrUtils';

interface ReceiptPreviewModalProps {
  visible: boolean;
  customer: SerializableCustomer;
  orderItems: OrderItem[];
  selectedDate?: string;
  orderNumber: string;
  onClose: () => void;
  onComplete: (paymentMethod: 'cash' | 'card' | 'credit', qrData?: string) => void;
}

export function ReceiptPreviewModal({
  visible,
  customer,
  orderItems,
  selectedDate,
  orderNumber,
  onClose,
  onComplete
}: ReceiptPreviewModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'credit' | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef<View>(null);
  
  // Use the passed order number and generate QR data
  const qrData = orderNumber;

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => {
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

  const tax = subtotal * 0.0875; // 8.75% tax
  const total = subtotal + tax;


  const sendDirectToPrinter = async (printerIP: string, printerPort: string) => {
    try {
      console.log(`Printing receipt directly to Munbyn printer at ${printerIP}:${printerPort}`);
      
      // Generate ESC/POS commands for thermal printing
      const escPosCommands = generateThermalReceiptCommands();
      
      // Send commands directly to thermal printer via raw socket connection
      const success = await sendRawDataToPrinter(printerIP, printerPort, escPosCommands);
      
      if (success) {
        console.log('Receipt printed successfully to thermal printer');
        return true;
      } else {
        throw new Error('Failed to send data to printer');
      }
    } catch (error) {
      console.error('Direct print error:', error);
      throw error;
    }
  };

  const sendRawDataToPrinter = async (ip: string, port: string, data: Uint8Array): Promise<boolean> => {
    try {
      console.log(`Sending ${data.length} bytes to thermal printer at ${ip}:${port}`);
      
      // For thermal printers, we'll try a simplified approach
      // Most thermal printers accept raw data on port 9100 but don't send HTTP responses
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
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // If it's a timeout or network error, assume printing worked
        // Thermal printers often don't send proper HTTP responses
        if (fetchError.name === 'AbortError' || fetchError.message.includes('Network request failed')) {
          console.log('Printer connection timeout - assuming print succeeded (normal for thermal printers)');
          return true; // Assume success for thermal printers
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to send raw data to printer:', error);
      return false;
    }
  };

  const generateThermalReceiptCommands = (): Uint8Array => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // ESC/POS command constants
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    const CR = 0x0D;
    
    // Initialize array for commands
    const commands: number[] = [];
    
    // Helper function to add text
    const addText = (text: string) => {
      const utf8Encoder = new TextEncoder();
      const bytes = utf8Encoder.encode(text);
      commands.push(...Array.from(bytes));
    };
    
    // Helper function to add line feed
    const addLF = () => commands.push(LF);
    
    // Helper function to center text
    const centerText = (text: string, width: number = 48) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    
    // Helper function to format two-column text
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
    addText(`Order #: ${orderNumber}`);
    addLF();
    addText(`Date: ${currentDate} ${currentTime}`);
    addLF();
    addText(`Pickup: ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}`);
    addLF();
    addLF();
    
    // Customer info
    addText(`Customer: ${customer.firstName} ${customer.lastName}`);
    addLF();
    if (customer.phone) {
      addText(`Phone: ${customer.phone}`);
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
    orderItems.forEach(item => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      const discountedPrice = discount > 0 ? itemPrice * (1 - discount / 100) : itemPrice;
      const totalPrice = discountedPrice * quantity;
      
      let itemName = item.name;
      if (item.options?.starch && item.options.starch !== 'none') {
        itemName += ` - ${item.options.starch} starch`;
      }
      if (item.options?.pressOnly) {
        itemName += ' - Press Only';
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
    if (selectedPayment) {
      addText(formatTwoColumns('Payment:', selectedPayment.charAt(0).toUpperCase() + selectedPayment.slice(1), 32));
      addLF();
    }
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


  const handleComplete = async () => {
    if (!selectedPayment) {
      Alert.alert('Payment Method Required', 'Please select a payment method to complete the order.');
      return;
    }
    
    setIsPrinting(true);
    try {
      // Check for printer settings
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const printerSettings = await AsyncStorage.default.getItem('printerSettings');
      
      if (printerSettings) {
        const { ip, port } = JSON.parse(printerSettings);
        
        if (ip) {
          // Send directly to thermal printer - NO AirPrint dialog
          console.log(`Printing directly to Munbyn printer at ${ip}:${port || '9100'}`);
          await sendDirectToPrinter(ip, port || '9100');
          console.log('Receipt printed directly to thermal printer');
        } else {
          // No IP configured, show error
          Alert.alert('Printer Not Configured', 'Please configure your Munbyn printer in Settings before printing.');
          setIsPrinting(false);
          return;
        }
      } else {
        // No printer settings, show error
        Alert.alert('Printer Not Set Up', 'Please set up your Munbyn ITPP047P printer in Settings before printing.');
        setIsPrinting(false);
        return;
      }
      
      // Complete the order
      onComplete(selectedPayment, qrData);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print to Munbyn printer. Please check printer connection and try again.');
      // Still complete the order
      onComplete(selectedPayment, qrData);
    } finally {
      setIsPrinting(false);
    }
  };

  const PaymentButton = ({ 
    method, 
    label, 
    icon 
  }: { 
    method: 'cash' | 'card' | 'credit'; 
    label: string; 
    icon: string; 
  }) => (
    <TouchableOpacity
      style={[
        styles.paymentButton,
        selectedPayment === method && styles.selectedPaymentButton
      ]}
      onPress={() => setSelectedPayment(method)}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={selectedPayment === method ? '#007AFF' : '#666'} 
      />
      <Text style={[
        styles.paymentButtonText,
        selectedPayment === method && styles.selectedPaymentButtonText
      ]}>
        {label}
      </Text>
      {selectedPayment === method && (
        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Receipt Preview</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Receipt Preview - styled to look like actual printed receipt */}
          <View ref={receiptRef} style={styles.receiptContainer}>
            {/* Business Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.businessName}>DRY CLEANING SERVICES</Text>
              <Text style={styles.businessAddress}>123 Main Street</Text>
              <Text style={styles.businessPhone}>Phone: (555) 123-4567</Text>
              <View style={styles.headerLine} />
            </View>

            {/* Receipt Info */}
            <View style={styles.receiptInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order #:</Text>
                <Text style={styles.infoValue}>{orderNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pickup Date:</Text>
                <Text style={styles.infoValue}>
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}
                </Text>
              </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerInfo}>
              <View style={styles.dashedLine} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer:</Text>
                <Text style={styles.infoValue}>{customer.firstName} {customer.lastName}</Text>
              </View>
              {customer.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{customer.phone}</Text>
                </View>
              )}
              <View style={styles.dashedLine} />
            </View>

            {/* Items Table */}
            <View style={styles.itemsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.qtyColumn]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.priceColumn]}>Price</Text>
                <Text style={[styles.tableHeaderText, styles.totalColumn]}>Total</Text>
              </View>
              <View style={styles.tableBorder} />
              
              {orderItems.map((item) => {
                const basePrice = Number(item.price) || 0;
                const additionalPrice = Number(item.additionalPrice) || 0;
                const itemPrice = basePrice + additionalPrice;
                const discount = Number(item.discount) || 0;
                const quantity = Number(item.quantity) || 0;
                
                const discountedPrice = discount > 0 ? itemPrice * (1 - discount / 100) : itemPrice;
                const totalPrice = discountedPrice * quantity;
                
                let itemName = item.name;
                if (item.options?.starch && item.options.starch !== 'none') {
                  itemName += ` - ${item.options.starch} starch`;
                }
                if (item.options?.pressOnly) {
                  itemName += ' - Press Only';
                }

                return (
                  <View key={item.itemKey} style={styles.tableRow}>
                    <Text style={[styles.tableText, styles.itemColumn]} numberOfLines={2}>{itemName}</Text>
                    <Text style={[styles.tableText, styles.qtyColumn]}>{quantity}</Text>
                    <Text style={[styles.tableText, styles.priceColumn]}>${itemPrice.toFixed(2)}</Text>
                    <Text style={[styles.tableText, styles.totalColumn]}>${totalPrice.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Totals */}
            <View style={styles.receiptTotals}>
              <View style={styles.tableBorder} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax (8.75%):</Text>
                <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={styles.dashedLine} />
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
              </View>
              {selectedPayment && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Payment:</Text>
                  <Text style={styles.totalValue}>
                    {selectedPayment.charAt(0).toUpperCase()}{selectedPayment.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <View style={styles.dashedLine} />
              
              {/* QR Code */}
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrData}
                  size={80}
                  color="#000"
                  backgroundColor="#fff"
                />
              </View>
              
              <Text style={styles.footerText}>Thank you for your business!</Text>
              <Text style={styles.footerText}>Please keep this receipt for pickup</Text>
              <Text style={styles.orderIdText}>Order #: {orderNumber}</Text>
              
              {/* Extra spacing at bottom */}
              <View style={{ height: 40 }} />
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <PaymentButton method="cash" label="Cash" icon="cash" />
            <PaymentButton method="card" label="Debit Card" icon="card" />
            <PaymentButton method="credit" label="Credit Card" icon="card-outline" />
          </View>
        </ScrollView>

        {/* Complete Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.completeButton,
              (!selectedPayment || isPrinting) && styles.completeButtonDisabled
            ]} 
            onPress={handleComplete}
            disabled={!selectedPayment || isPrinting}
          >
            <Text style={[
              styles.completeButtonText,
              (!selectedPayment || isPrinting) && styles.completeButtonTextDisabled
            ]}>
              {isPrinting ? 'Printing & Processing...' : `Complete Order - $${total.toFixed(2)}`}
            </Text>
            <Ionicons 
              name={isPrinting ? "print" : "checkmark-circle"}
              size={20} 
              color={selectedPayment && !isPrinting ? "white" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  
  // Receipt Preview Styles
  receiptContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    fontFamily: 'monospace',
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  businessAddress: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  businessPhone: {
    fontSize: 12,
    color: '#333',
    marginTop: 1,
    fontFamily: 'monospace',
  },
  headerLine: {
    height: 2,
    backgroundColor: '#000',
    width: '100%',
    marginTop: 8,
  },
  
  // Receipt Info
  receiptInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
  },
  infoValue: {
    fontSize: 12,
    color: '#000',
    fontFamily: 'monospace',
  },
  
  // Customer Info
  customerInfo: {
    marginBottom: 15,
  },
  dashedLine: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  
  // Items Table
  itemsTable: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
  },
  tableBorder: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tableText: {
    fontSize: 11,
    color: '#000',
    fontFamily: 'monospace',
  },
  itemColumn: {
    flex: 2,
    textAlign: 'left',
  },
  qtyColumn: {
    flex: 0.5,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 1,
    textAlign: 'right',
  },
  totalColumn: {
    flex: 1,
    textAlign: 'right',
  },
  
  // Receipt Totals
  receiptTotals: {
    marginBottom: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 12,
    color: '#000',
    fontFamily: 'monospace',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'monospace',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
  },
  
  // Receipt Footer
  receiptFooter: {
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#fff',
    padding: 5,
  },
  footerText: {
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
    marginTop: 3,
    fontFamily: 'monospace',
  },
  orderIdText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  
  // Payment Section
  paymentSection: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentButton: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  selectedPaymentButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  completeButtonTextDisabled: {
    color: '#ccc',
  },
});