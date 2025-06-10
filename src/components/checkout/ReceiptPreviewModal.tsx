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
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { OrderItem } from '../../types/order';
import { SerializableCustomer } from '../../navigation/types';
import { QRCode } from '../../utils/qrUtils';

interface ReceiptPreviewModalProps {
  visible: boolean;
  customer: SerializableCustomer;
  orderItems: OrderItem[];
  selectedDate?: string;
  onClose: () => void;
  onComplete: (paymentMethod: 'cash' | 'card' | 'credit', qrData?: string) => void;
}

export function ReceiptPreviewModal({
  visible,
  customer,
  orderItems,
  selectedDate,
  onClose,
  onComplete
}: ReceiptPreviewModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'credit' | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef<View>(null);
  
  // Generate consistent order number and QR data
  const orderNumber = `ORD${Date.now().toString().slice(-6)}`;
  const qrData = `ORDER:${orderNumber}:${customer.id}:${Date.now()}`;

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

  const generateReceiptHTML = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let itemsHTML = '';
    orderItems.forEach(item => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      const discountedPrice = discount > 0 ? itemPrice * (1 - discount / 100) : itemPrice;
      const totalPrice = discountedPrice * quantity;
      
      let optionsText = '';
      if (item.options?.starch && item.options.starch !== 'none') {
        optionsText += ` - ${item.options.starch} starch`;
      }
      if (item.options?.pressOnly) {
        optionsText += ' - Press Only';
      }
      
      itemsHTML += `
        <tr>
          <td style="text-align: left; padding: 4px 0;">${item.name}${optionsText}</td>
          <td style="text-align: center; padding: 4px 0;">${quantity}</td>
          <td style="text-align: right; padding: 4px 0;">$${itemPrice.toFixed(2)}</td>
          <td style="text-align: right; padding: 4px 0;">$${totalPrice.toFixed(2)}</td>
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .receipt-info { margin-bottom: 15px; }
          .customer-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .items-table th { border-bottom: 1px solid #000; padding: 5px 0; text-align: left; }
          .items-table td { padding: 3px 0; }
          .totals { border-top: 1px solid #000; padding-top: 10px; }
          .total-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .grand-total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          .small { font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">DRY CLEANING SERVICES</div>
          <div class="small">123 Main Street</div>
          <div class="small">Phone: (555) 123-4567</div>
        </div>
        
        <div class="receipt-info">
          <div><strong>Order #:</strong> ${orderNumber}</div>
          <div><strong>Date:</strong> ${currentDate}</div>
          <div><strong>Time:</strong> ${currentTime}</div>
          <div><strong>Pickup Date:</strong> ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}</div>
        </div>
        
        <div class="customer-info">
          <div><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</div>
          ${customer.phone ? `<div><strong>Phone:</strong> ${customer.phone}</div>` : ''}
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Tax (8.75%):</span>
            <span>$${tax.toFixed(2)}</span>
          </div>
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          <div class="total-line" style="margin-top: 10px;">
            <span>Payment:</span>
            <span>${selectedPayment?.charAt(0).toUpperCase()}${selectedPayment?.slice(1)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div class="qr-section">
            <canvas id="qrcode" width="100" height="100" style="margin: 10px 0;"></canvas>
          </div>
          <div class="small">Thank you for your business!</div>
          <div class="small">Please keep this receipt for pickup</div>
          <div class="small">Order ID: ${qrData}</div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
          QRCode.toCanvas(document.getElementById('qrcode'), "${qrData}", {
            width: 100,
            height: 100,
            margin: 1
          });
        </script>
      </body>
      </html>
    `;
  };

  const sendDirectToPrinter = async (html: string, printerIP: string, printerPort: string) => {
    try {
      // Create ESC/POS commands for thermal printer
      const escPosData = generateESCPOSCommands(html);
      
      // Send raw data to printer via TCP socket
      const response = await fetch(`http://${printerIP}:${printerPort}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: escPosData,
      });
      
      if (response.ok) {
        console.log('Successfully sent to thermal printer');
        return true;
      } else {
        throw new Error('Printer response not OK');
      }
    } catch (error) {
      console.error('Direct printer error:', error);
      throw error;
    }
  };

  const generateESCPOSCommands = (html: string) => {
    // Convert HTML receipt to ESC/POS thermal printer commands
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';
    const CR = '\x0D';
    
    let escPos = '';
    
    // Initialize printer
    escPos += ESC + '@'; // Initialize
    escPos += ESC + 'a' + '\x01'; // Center alignment
    
    // Business name (large text)
    escPos += ESC + '!' + '\x18'; // Double height and width
    escPos += 'DRY CLEANING SERVICES' + LF;
    escPos += ESC + '!' + '\x00'; // Normal size
    
    // Business details
    escPos += '123 Main Street' + LF;
    escPos += 'Phone: (555) 123-4567' + LF;
    escPos += '--------------------------------' + LF;
    
    // Order details
    escPos += ESC + 'a' + '\x00'; // Left alignment
    escPos += `Order #: ${orderNumber}` + LF;
    escPos += `Date: ${new Date().toLocaleDateString()}` + LF;
    escPos += `Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` + LF;
    escPos += `Pickup: ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Today'}` + LF;
    escPos += LF;
    
    // Customer info
    escPos += `Customer: ${customer.firstName} ${customer.lastName}` + LF;
    if (customer.phone) {
      escPos += `Phone: ${customer.phone}` + LF;
    }
    escPos += '--------------------------------' + LF;
    
    // Items header
    escPos += 'Item                 Qty  Total' + LF;
    escPos += '--------------------------------' + LF;
    
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
        itemName += ` - ${item.options.starch}`;
      }
      if (item.options?.pressOnly) {
        itemName += ' - Press Only';
      }
      
      // Truncate item name to fit
      if (itemName.length > 18) {
        itemName = itemName.substring(0, 15) + '...';
      }
      
      const line = `${itemName.padEnd(18)} ${quantity.toString().padStart(2)} $${totalPrice.toFixed(2).padStart(6)}`;
      escPos += line + LF;
    });
    
    escPos += '--------------------------------' + LF;
    
    // Totals
    const subtotal = orderItems.reduce((sum, item) => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      const discountedPrice = discount > 0 ? itemPrice * (1 - discount / 100) : itemPrice;
      return sum + (discountedPrice * quantity);
    }, 0);
    
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    
    escPos += `Subtotal:               $${subtotal.toFixed(2).padStart(8)}` + LF;
    escPos += `Tax (8.75%):            $${tax.toFixed(2).padStart(8)}` + LF;
    escPos += '--------------------------------' + LF;
    escPos += ESC + '!' + '\x08'; // Emphasized text
    escPos += `TOTAL:                  $${total.toFixed(2).padStart(8)}` + LF;
    escPos += ESC + '!' + '\x00'; // Normal text
    escPos += LF;
    
    // Payment method
    if (selectedPayment) {
      escPos += `Payment: ${selectedPayment.charAt(0).toUpperCase()}${selectedPayment.slice(1)}` + LF;
    }
    escPos += LF;
    
    // QR Code - Using standard ESC/POS QR code commands
    escPos += ESC + 'a' + '\x01'; // Center alignment
    escPos += LF;
    
    // QR Code commands for Munbyn ITPP047P
    // Function 165 - QR Code: Select the model
    escPos += '\x1D' + '(k' + '\x04' + '\x00' + '\x31' + '\x41' + '\x32' + '\x00';
    
    // Function 167 - QR Code: Set the size of module
    escPos += '\x1D' + '(k' + '\x03' + '\x00' + '\x31' + '\x43' + '\x03'; // Size 3 (smaller for receipts)
    
    // Function 169 - QR Code: Select the error correction level
    escPos += '\x1D' + '(k' + '\x03' + '\x00' + '\x31' + '\x45' + '\x30'; // Level L (7%)
    
    // Function 180 - QR Code: Store the data in the symbol storage area
    const qrDataBytes = new TextEncoder().encode(qrData);
    const dataLength = qrDataBytes.length + 3;
    const pL = dataLength & 0xFF;
    const pH = (dataLength >> 8) & 0xFF;
    
    escPos += '\x1D' + '(k' + String.fromCharCode(pL, pH) + '\x31' + '\x50' + '\x30';
    escPos += qrData;
    
    // Function 181 - QR Code: Print the symbol data in the symbol storage area
    escPos += '\x1D' + '(k' + '\x03' + '\x00' + '\x31' + '\x51' + '\x30';
    escPos += LF + LF;
    
    // Footer
    escPos += 'Thank you for your business!' + LF;
    escPos += 'Please keep this receipt' + LF;
    escPos += 'for pickup' + LF;
    escPos += LF + LF + LF;
    
    // Cut paper
    escPos += GS + 'V' + '\x42' + '\x00'; // Partial cut
    
    // Convert string to bytes
    const encoder = new TextEncoder();
    return encoder.encode(escPos);
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
          // Send directly to thermal printer
          console.log(`Printing to Munbyn printer at ${ip}:${port || '9100'}`);
          const html = generateReceiptHTML();
          await sendDirectToPrinter(html, ip, port || '9100');
          console.log('Receipt sent successfully to thermal printer');
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
                <Text style={styles.infoValue}>ORD{Date.now().toString().slice(-6)}</Text>
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
              <Text style={styles.orderIdText}>Order ID: {qrData}</Text>
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