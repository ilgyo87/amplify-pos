import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod, PaymentInfo } from '../../types/order';
import { CardFieldInput, useStripe } from '@stripe/stripe-react-native';
import { stripeService } from '../../services/stripeService';
import { StripeCardForm } from './StripeCardForm';
import { StripeTerminalForm } from './StripeTerminalForm';
import type { PaymentIntent } from '../../services/stripeTerminalService';

interface PaymentModalProps {
  visible: boolean;
  orderTotal: number;
  onClose: () => void;
  onCompletePayment: (paymentInfo: PaymentInfo) => void;
}

export function PaymentModal({
  visible,
  orderTotal,
  onClose,
  onCompletePayment
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [tipAmount, setTipAmount] = useState(0);
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { createToken } = useStripe();
  const [checkNumber, setCheckNumber] = useState('');
  const [accountId, setAccountId] = useState('');
  const [customTip, setCustomTip] = useState('');
  const [showTerminalForm, setShowTerminalForm] = useState(false);

  const handleTerminalPaymentSuccess = (paymentIntent: PaymentIntent.Type) => {
    const paymentInfo: PaymentInfo = {
      method: 'terminal',
      amount: totalWithTip,
      tip: tipAmount > 0 ? tipAmount : undefined,
      stripeChargeId: paymentIntent.id,
    };
    
    setShowTerminalForm(false);
    onCompletePayment(paymentInfo);
  };

  const handleTerminalPaymentError = (error: string) => {
    Alert.alert('Terminal Payment Failed', error);
    setShowTerminalForm(false);
  };

  const handleTerminalCancel = () => {
    setShowTerminalForm(false);
  };

  const tipPresets = [0, 1, 2, 3, 5];
  const totalWithTip = orderTotal + tipAmount;

  const handleTipSelect = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
  };

  const handleCustomTipChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTipAmount(numValue);
    setCustomTip(value);
  };

  useEffect(() => {
    const checkStripeConfig = async () => {
      const isConfigured = stripeService.isInitialized();
      setIsStripeEnabled(isConfigured);
    };

    checkStripeConfig();

    // Subscribe to Stripe settings changes
    const unsubscribe = stripeService.onSettingsChange((settings) => {
      setIsStripeEnabled(!!settings?.publishableKey);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      // Initialize Stripe
    };

    initialize();
  }, []);

  const validatePayment = (): boolean => {
    if (selectedMethod === 'card') {
      if (!isStripeEnabled) {
        Alert.alert('Error', 'Stripe is not configured. Please configure Stripe in settings.');
        return false;
      }
      if (!cardDetails?.complete) {
        Alert.alert('Error', 'Please enter valid card details');
        return false;
      }
    }
    
    if (selectedMethod === 'terminal') {
      Alert.alert('Info', 'Please use the "Start Terminal Payment" button to process the payment.');
      return false;
    }
    
    if (selectedMethod === 'check' && !checkNumber.trim()) {
      Alert.alert('Error', 'Please enter the check number');
      return false;
    }
    
    if (selectedMethod === 'account' && !accountId.trim()) {
      Alert.alert('Error', 'Please enter the account ID');
      return false;
    }
    
    return true;
  };

  const handleCompletePayment = async () => {
    if (isProcessingPayment) return;
    if (!validatePayment()) return;

    try {
      setIsProcessingPayment(true);

      let stripeToken;
      let stripeChargeId;
      
      if (selectedMethod === 'card' && cardDetails?.complete) {
        if (!stripeService.isInitialized()) {
          Alert.alert('Error', 'Stripe is not properly initialized. Please check your Stripe configuration in settings.');
          return;
        }

        const { error, token } = await createToken({
          type: 'Card',
        });
        if (error) {
          console.error('Stripe token creation error:', error);
          Alert.alert('Payment Error', error.message || 'Failed to process card payment. Please check your card details and try again.');
          return;
        }
        
        if (!token) {
          Alert.alert('Error', 'Failed to create payment token. Please try again.');
          return;
        }
        
        stripeToken = token;

        // Process the actual payment through backend
        try {
          const paymentResult = await stripeService.processPayment(
            token.id,
            totalWithTip,
            `POS Order Payment - Amount: $${totalWithTip.toFixed(2)}`,
            {
              tip_amount: tipAmount || 0,
              order_total: orderTotal
            }
          );
          
          stripeChargeId = paymentResult.chargeId;
          console.log('Payment processed successfully:', stripeChargeId);
          
        } catch (paymentError: any) {
          console.error('Payment processing failed:', paymentError);
          Alert.alert('Payment Failed', paymentError.message || 'Payment could not be processed. Please try again.');
          return;
        }
      }

      const paymentInfo: PaymentInfo = {
        method: selectedMethod,
        amount: totalWithTip,
        tip: tipAmount > 0 ? tipAmount : undefined,
        cardLast4: selectedMethod === 'card' ? cardDetails?.last4 : undefined,
        checkNumber: selectedMethod === 'check' ? checkNumber : undefined,
        accountId: selectedMethod === 'account' ? accountId : undefined,
        stripeToken: stripeToken?.id,
        stripeChargeId: stripeChargeId, // Add the actual charge ID
      };

      onCompletePayment(paymentInfo);
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Error', 'Failed to process payment. Please check your connection and try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod, icon: string, label: string) => {
    const isSelected = selectedMethod === method;
    
    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.paymentMethod,
          isSelected && styles.selectedPaymentMethod
        ]}
        onPress={() => setSelectedMethod(method)}
      >
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={isSelected ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.paymentMethodText,
          isSelected && styles.selectedPaymentMethodText
        ]}>
          {label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderPaymentDetails = () => {
    switch (selectedMethod) {
      case 'card':
        if (!isStripeEnabled) {
          return (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsLabel}>Stripe is not configured</Text>
              <Text style={styles.detailsHint}>
                Please configure Stripe in the settings to accept card payments.
              </Text>
            </View>
          );
        }
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Enter card details:</Text>
            <StripeCardForm onCardChange={setCardDetails} />
          </View>
        );
      
      case 'terminal':
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Card Reader Payment</Text>
            <Text style={styles.detailsHint}>
              Connect to a Stripe Terminal card reader to accept in-person card payments.
            </Text>
            <TouchableOpacity
              style={styles.terminalButton}
              onPress={() => setShowTerminalForm(true)}
            >
              <Ionicons name="card-outline" size={20} color="#007AFF" />
              <Text style={styles.terminalButtonText}>
                Start Terminal Payment
              </Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'check':
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Check Number:</Text>
            <TextInput
              style={styles.textInput}
              value={checkNumber}
              onChangeText={setCheckNumber}
              placeholder="Enter check number"
              keyboardType="numeric"
            />
          </View>
        );
      
      case 'account':
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Account ID:</Text>
            <TextInput
              style={styles.textInput}
              value={accountId}
              onChangeText={setAccountId}
              placeholder="Enter account ID"
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Total</Text>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Subtotal + Tax:</Text>
              <Text style={styles.totalAmount}>${orderTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Tip Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Tip (Optional)</Text>
            <View style={styles.tipPresets}>
              {tipPresets.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.tipButton,
                    tipAmount === amount && !customTip && styles.selectedTipButton
                  ]}
                  onPress={() => handleTipSelect(amount)}
                >
                  <Text style={[
                    styles.tipButtonText,
                    tipAmount === amount && !customTip && styles.selectedTipButtonText
                  ]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.customTipContainer}>
              <Text style={styles.customTipLabel}>Custom Amount:</Text>
              <TextInput
                style={styles.customTipInput}
                value={customTip}
                onChangeText={handleCustomTipChange}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {renderPaymentMethod('cash', 'cash', 'Cash')}
              {renderPaymentMethod('card', 'card', 'Credit/Debit Card')}
              {renderPaymentMethod('terminal', 'card-outline', 'Card Reader')}
              {renderPaymentMethod('check', 'document-text', 'Check')}
              {renderPaymentMethod('account', 'person', 'Account')}
            </View>
          </View>

          {/* Payment Details */}
          {renderPaymentDetails()}

          {/* Final Total */}
          <View style={styles.section}>
            <View style={styles.finalTotalContainer}>
              <Text style={styles.finalTotalLabel}>Total Amount:</Text>
              <Text style={styles.finalTotalAmount}>${totalWithTip.toFixed(2)}</Text>
            </View>
            {tipAmount > 0 && (
              <Text style={styles.tipIncluded}>
                (includes ${tipAmount.toFixed(2)} tip)
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Complete Payment Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.completeButton, isProcessingPayment && styles.completeButtonDisabled]}
            onPress={handleCompletePayment}
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <ActivityIndicator color="#fff" style={styles.buttonLoader} />
            ) : (
              <Text style={styles.completeButtonText}>
                Complete Payment - ${totalWithTip.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Stripe Terminal Form Modal */}
      <Modal
        visible={showTerminalForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleTerminalCancel}
      >
        <StripeTerminalForm
          amount={totalWithTip}
          onPaymentSuccess={handleTerminalPaymentSuccess}
          onPaymentError={handleTerminalPaymentError}
          onCancel={handleTerminalCancel}
        />
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  tipPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTipButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedTipButtonText: {
    color: 'white',
  },
  customTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTipLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  customTipInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPaymentMethod: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  selectedPaymentMethodText: {
    color: '#007AFF',
  },
  detailsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  finalTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  finalTotalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  tipIncluded: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  buttonLoader: {
    marginRight: 8,
  },
  detailsHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  terminalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  terminalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});