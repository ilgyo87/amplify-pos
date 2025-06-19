import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderDocument } from '../../database/schemas/order';

interface CancelOrderModalProps {
  visible: boolean;
  order: OrderDocument | null;
  refundAmount: string;
  refundReason: string;
  isProcessing: boolean;
  onRefundAmountChange: (value: string) => void;
  onRefundReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CancelOrderModal({
  visible,
  order,
  refundAmount,
  refundReason,
  isProcessing,
  onRefundAmountChange,
  onRefundReasonChange,
  onCancel,
  onConfirm,
}: CancelOrderModalProps) {
  if (!visible || !order) return null;

  const hasStripePayment = !!order.paymentInfo?.stripeChargeId;
  const suggestedRefund = order.total.toFixed(2);

  const handleRefundAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) return;
    
    onRefundAmountChange(cleaned);
  };

  const validateAndConfirm = () => {
    if (hasStripePayment && refundAmount) {
      const amount = parseFloat(refundAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid refund amount');
        return;
      }
      if (amount > order.total) {
        Alert.alert('Invalid Amount', 'Refund amount cannot exceed order total');
        return;
      }
    }
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={onCancel}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order</Text>
              <TouchableOpacity onPress={onCancel}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Order #</Text>
              <Text style={styles.orderInfoValue}>{order.orderNumber}</Text>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Total Amount</Text>
              <Text style={styles.orderInfoValue}>${order.total.toFixed(2)}</Text>
            </View>

            {hasStripePayment && (
              <View style={styles.refundSection}>
                <Text style={styles.sectionTitle}>Refund Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Refund Amount</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={refundAmount}
                      onChangeText={handleRefundAmountChange}
                      placeholder={suggestedRefund}
                      keyboardType="decimal-pad"
                      editable={!isProcessing}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.fullRefundButton}
                    onPress={() => onRefundAmountChange(suggestedRefund)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.fullRefundButtonText}>Full Refund</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason (Optional)</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={refundReason}
                    onChangeText={onRefundReasonChange}
                    placeholder="Enter reason for cancellation"
                    multiline
                    numberOfLines={3}
                    editable={!isProcessing}
                  />
                </View>
              </View>
            )}

            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#ff9500" />
              <Text style={styles.warningText}>
                This action cannot be undone. The order will be marked as cancelled
                {hasStripePayment && refundAmount && ` and $${refundAmount} will be refunded to the customer`}.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={onCancel}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Keep Order</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton, isProcessing && styles.disabledButton]} 
                onPress={validateAndConfirm}
                disabled={isProcessing}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Processing...' : 'Cancel Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  refundSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  fullRefundButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  fullRefundButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  reasonInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff5e6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});