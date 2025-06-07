import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState, useRef } from 'react';
import { generateLabelHTML, printLabel } from '../../utils/printUtils';
import { QRCode } from '../../utils/qrUtils';
import { BaseScreen } from '../BaseScreen';

export default function OrdersScreen() {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Include the QR code in the order data for printing
      const orderDataWithQR = {
        ...orderData,
        qrImageBase64
      };
      const html = await generateLabelHTML(orderDataWithQR);
      await printLabel(html);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print label');
    } finally {
      setIsPrinting(false);
    }
  };

  // Sample order data - replace with your actual data
  const orderData = {
    orderNumber: '12345',
    customerName: 'John Doe',
    garmentType: 'Shirt',
    notes: 'No starch, rush order',
  };

  // Generate a simple payload for the QR code
  const qrPayload = JSON.stringify({
    orderNumber: orderData.orderNumber,
    customerName: orderData.customerName,
    garmentType: orderData.garmentType,
    timestamp: new Date().toISOString(),
  });

  // Generate QR code as SVG string for printing
  const qrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#ffffff"/>
      <!-- QR code pattern would be generated here -->
      <rect x="10" y="10" width="80" height="80" fill="#000000" fill-opacity="0.1"/>
      <!-- Simple QR code pattern (simplified for example) -->
      <rect x="20" y="20" width="10" height="10" fill="#000000"/>
      <rect x="70" y="20" width="10" height="10" fill="#000000"/>
      <rect x="20" y="70" width="10" height="10" fill="#000000"/>
      <text x="50" y="55" font-family="Arial" font-size="8" text-anchor="middle" fill="#000000">
        ${orderData.orderNumber}
      </text>
    </svg>
  `;
  
  const qrImageBase64 = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(qrSvg);

  return (
    <BaseScreen title="Orders">
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Order Label</Text>
          
          {/* QR Label Preview */}
          <View style={styles.labelContainer}>
            <View style={styles.labelContent}>
              <Text style={styles.orderNumber}>
                Order #: {orderData.orderNumber}
              </Text>
              <Text style={styles.customerName}>
                Customer: {orderData.customerName}
              </Text>
              <Text style={styles.garmentType}>
                Type: {orderData.garmentType}
              </Text>
              <Text style={styles.notes}>
                Notes: {orderData.notes}
              </Text>
              <QRCode value={qrPayload} size={70} />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, isPrinting && styles.buttonDisabled]}
              onPress={handlePrint}
              disabled={isPrinting}
            >
              <Text style={styles.actionButtonText}>
                {isPrinting ? 'Printing...' : 'Print Label'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  labelContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  labelContent: {
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 6,
  },
  garmentType: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 6,
  },
  notes: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  labelBold: {
    fontWeight: '600',
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: '90%',
    width: '90%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 20,
    color: '#6b7280',
    padding: 5,
  },
  webviewContainer: {
    height: 500,
    width: '100%',
    backgroundColor: '#f9fafb',
  },
  webview: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  printModalButton: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
