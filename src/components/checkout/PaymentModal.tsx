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
import { 
  useStripeTerminal,
} from '@stripe/stripe-terminal-react-native';

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
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { createToken } = useStripe();
  const [checkNumber, setCheckNumber] = useState('');
  const [accountId, setAccountId] = useState('');
  const [currentPaymentIntent, setCurrentPaymentIntent] = useState<any>(null);
  
  // Stripe Terminal hooks - simplified for checkout
  const {
    connectedReader,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    cancelPaymentIntent,
    isInitialized,
  } = useStripeTerminal();

  const handleTerminalPayment = async () => {
    if (!connectedReader) {
      Alert.alert(
        'No Reader Connected',
        'Please connect a card reader in Settings → Payment Settings → Card Reader'
      );
      return;
    }
    
    if (!isInitialized) {
      Alert.alert(
        'Terminal Not Ready',
        'Stripe Terminal is still initializing. Please wait a moment and try again.'
      );
      return;
    }

    try {
      setIsProcessingPayment(true);

      // For now, Terminal payments will go directly to platform account
      // TODO: In production, you'd need to handle destination charges differently
      // as Terminal SDK doesn't directly support destination charges
      
      // Create payment intent
      const { paymentIntent, error: createError } = await createPaymentIntent({
        amount: Math.round(orderTotal * 100), // Convert to cents
        currency: 'usd',
      });

      if (createError) {
        throw new Error(createError.message);
      }

      setCurrentPaymentIntent(paymentIntent);

      // Collect payment method
      const { paymentIntent: collectedPI, error: collectError } = await collectPaymentMethod({
        paymentIntent: paymentIntent!,
      });

      if (collectError) {
        throw new Error(collectError.message);
      }

      // Confirm payment
      const { paymentIntent: confirmedPI, error: confirmError } = await confirmPaymentIntent({
        paymentIntent: collectedPI!,
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Payment successful
      const paymentInfo: PaymentInfo = {
        method: 'terminal',
        amount: orderTotal,
        stripeChargeId: confirmedPI!.id,
      };

      onCompletePayment(paymentInfo);
      
    } catch (error: any) {
      console.error('Terminal payment failed:', error);
      Alert.alert('Payment Failed', error && typeof error === 'object' && 'message' in error ? error.message : 'Failed to process terminal payment');
      
      // Cancel the payment intent if it exists
      if (currentPaymentIntent) {
        try {
          await cancelPaymentIntent({
            paymentIntent: currentPaymentIntent,
          });
          setCurrentPaymentIntent(null);
        } catch (cancelError) {
          console.error('Failed to cancel payment intent:', cancelError);
        }
      }
    } finally {
      setIsProcessingPayment(false);
    }
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
    // Log terminal state for debugging
    console.log('[STRIPE TERMINAL] State update:', {
      isInitialized,
      connectedReader: !!connectedReader,
      isStripeEnabled
    });
  }, [isInitialized, connectedReader, isStripeEnabled]);

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
      if (!connectedReader) {
        Alert.alert('Error', 'Please connect a card reader first.');
        return false;
      }
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

    // Handle terminal payments separately
    if (selectedMethod === 'terminal') {
      await handleTerminalPayment();
      return;
    }

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
            orderTotal,
            `POS Order Payment - Amount: $${orderTotal.toFixed(2)}`,
            {
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
        amount: orderTotal,
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
          styles.paymentMethodIcon,
          isSelected && styles.selectedPaymentMethodIcon
        ]}
        onPress={() => setSelectedMethod(method)}
      >
        <Ionicons 
          name={icon as any} 
          size={28} 
          color={isSelected ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.paymentMethodLabel,
          isSelected && styles.selectedPaymentMethodLabel
        ]}>
          {label}
        </Text>
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
            {!isStripeEnabled ? (
              <View>
                <Text style={styles.detailsHint}>
                  Stripe is not configured. Please configure Stripe in settings first.
                </Text>
              </View>
            ) : connectedReader ? (
              <View>
                <Text style={styles.detailsHint}>
                  Reader: {connectedReader.label || connectedReader.serialNumber}
                </Text>
                
                {connectedReader.batteryLevel && (
                  <Text style={styles.detailsHint}>
                    Battery: {Math.round(connectedReader.batteryLevel * 100)}%
                  </Text>
                )}
                
                <TouchableOpacity
                  style={styles.terminalButton}
                  onPress={handleTerminalPayment}
                  disabled={isProcessingPayment}
                >
                  <Ionicons name="card" size={20} color="#007AFF" />
                  <Text style={styles.terminalButtonText}>
                    {isProcessingPayment ? 'Processing...' : 'Tap Card on Reader'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.terminalInstructions}>
                  Customer should tap, insert, or swipe their card on the reader
                </Text>
              </View>
            ) : (
              <View style={styles.noReaderContainer}>
                <Ionicons name="alert-circle" size={48} color="#ff9500" />
                <Text style={styles.noReaderTitle}>No Card Reader Connected</Text>
                <Text style={styles.noReaderText}>
                  Please connect a card reader in Settings → Payment Settings → Card Reader
                </Text>
              </View>
            )}
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
              <Text style={styles.finalTotalAmount}>${orderTotal.toFixed(2)}</Text>
            </View>
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
                Complete Payment
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodIcon: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedPaymentMethodIcon: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedPaymentMethodLabel: {
    color: '#007AFF',
    fontWeight: '600',
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
  readersList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  readersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  readerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  readerInfo: {
    flex: 1,
  },
  readerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  readerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  simulatedToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  simulatedToggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  updateContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  updateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  updateEstimate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  updateWarning: {
    fontSize: 13,
    color: '#ff9500',
    textAlign: 'center',
    fontWeight: '500',
  },
  noReaderContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noReaderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  terminalInstructions: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});