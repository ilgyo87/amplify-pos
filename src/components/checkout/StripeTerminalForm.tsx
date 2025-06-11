import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentIntent } from '../../services/stripeTerminalService';

interface StripeTerminalFormProps {
  amount: number;
  onPaymentSuccess: (paymentIntent: PaymentIntent.Type) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

export function StripeTerminalForm({
  amount,
  onPaymentSuccess,
  onPaymentError,
  onCancel
}: StripeTerminalFormProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentStep, setCurrentStep] = useState<'connect' | 'payment' | 'processing'>('connect');
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectSimulator = async () => {
    try {
      setIsProcessingPayment(true);
      setCurrentStep('payment');
      
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnected(true);
      setCurrentStep('payment');
      Alert.alert('Connected', 'Successfully connected to simulated card reader.');
    } catch (error) {
      onPaymentError('Failed to connect to card reader');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleStartPayment = async () => {
    try {
      setIsProcessingPayment(true);
      setCurrentStep('processing');

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create a mock successful payment intent
      const mockPaymentIntent: PaymentIntent.Type = {
        id: 'pi_simulated_' + Date.now(),
        object: 'payment_intent',
        amount: Math.round(amount * 100),
        currency: 'usd',
        status: 'succeeded',
        charges: {
          object: 'list',
          data: [{
            id: 'ch_simulated_' + Date.now(),
            object: 'charge',
            amount: Math.round(amount * 100),
            currency: 'usd',
            status: 'succeeded',
            paymentMethod: {
              id: 'pm_simulated',
              object: 'payment_method',
              card: {
                brand: 'visa',
                last4: '4242'
              }
            }
          }]
        }
      };

      onPaymentSuccess(mockPaymentIntent);
    } catch (error) {
      onPaymentError('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setCurrentStep('connect');
    Alert.alert('Disconnected', 'Card reader has been disconnected.');
  };

  if (currentStep === 'connect') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="card-outline" size={48} color="#007AFF" />
          <Text style={styles.title}>Connect Card Reader</Text>
          <Text style={styles.subtitle}>
            Connect a Stripe Terminal reader to accept card payments
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConnectSimulator}
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="phone-portrait" size={20} color="#fff" />
            )}
            <Text style={styles.primaryButtonText}>
              {isProcessingPayment ? 'Connecting...' : 'Use Simulated Reader'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              For testing purposes, this will simulate a Stripe Terminal card reader.
              In production, you would discover and connect to real hardware.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={currentStep === 'processing' ? 'card' : 'checkmark-circle'} 
          size={48} 
          color={currentStep === 'processing' ? '#FFA500' : '#28a745'} 
        />
        <Text style={styles.title}>
          {currentStep === 'processing' ? 'Processing Payment' : 'Card Reader Connected'}
        </Text>
        <Text style={styles.subtitle}>
          {currentStep === 'processing' 
            ? 'Please present your card to the reader'
            : 'Simulated Reader Ready'
          }
        </Text>
      </View>

      <View style={styles.paymentSection}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount to Charge</Text>
          <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
        </View>

        {currentStep === 'payment' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartPayment}
          >
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Payment</Text>
          </TouchableOpacity>
        )}

        {currentStep === 'processing' && (
          <View style={styles.processingInfo}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>
              Present or insert card when prompted by the reader
            </Text>
            <Text style={styles.processingSubtext}>
              This may take a few moments...
            </Text>
          </View>
        )}
      </View>

      {currentStep === 'payment' && (
        <View style={styles.readerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleDisconnect}>
            <Ionicons name="unlink" size={20} color="#dc3545" />
            <Text style={[styles.secondaryButtonText, { color: '#dc3545' }]}>
              Disconnect Reader
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={onCancel}
        disabled={isProcessingPayment}
      >
        <Text style={styles.cancelButtonText}>
          {isProcessingPayment ? 'Processing...' : 'Cancel'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  paymentSection: {
    marginBottom: 32,
  },
  amountContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#28a745',
  },
  processingInfo: {
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  processingText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginTop: 8,
  },
  readerActions: {
    marginBottom: 16,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
});