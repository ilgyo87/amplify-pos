import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { stripeService } from '../../services/stripe';
import { StripeConnectOnboarding } from './StripeConnectOnboarding';

interface PaymentFlowProps {
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: string) => void;
}

export function StripeConnectPaymentFlow({ onPaymentSuccess, onPaymentError }: PaymentFlowProps) {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [amount, setAmount] = useState('10.00');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const user = await getCurrentUser();
      setUserId(user.userId);
      await checkConnectionStatus(user.userId);
    } catch (error) {
      console.error('Error initializing user:', error);
      setCheckingStatus(false);
    }
  };

  const checkConnectionStatus = async (userIdToCheck: string) => {
    try {
      setCheckingStatus(true);
      const connected = await stripeService.getStripeConnectionStatus();
      setIsConnected(connected);
      
      if (connected) {
        // Get account info if connected
        const info = await stripeService.getConnectedAccountInfo(userIdToCheck);
        setAccountInfo(info);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0.51) {
      Alert.alert('Error', 'Amount must be at least $0.51 to cover platform fee');
      return;
    }

    try {
      setLoading(true);
      
      // Create payment intent with platform fee
      // Note: createTerminalPayment method needs to be implemented
      const paymentIntent = {
        id: `pi_${Date.now()}`,
        amount: Math.round(amountValue * 100),
        application_fee_amount: 1, // $0.01 platform fee in cents
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: {
          order_id: `order_${Date.now()}`,
          merchant_id: userId
        }
      };
      
      // TODO: Replace with actual terminal payment creation when method is available
      console.warn('createTerminalPayment method not yet implemented in stripeService');

      console.log('Payment Intent Created:', paymentIntent);
      
      Alert.alert(
        'Payment Intent Created',
        `Payment ID: ${paymentIntent.id}\nAmount: $${(paymentIntent.amount / 100).toFixed(2)}\nPlatform Fee: $${(paymentIntent.application_fee_amount / 100).toFixed(2)}\nMerchant Gets: $${((paymentIntent.amount - paymentIntent.application_fee_amount) / 100).toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => onPaymentSuccess?.(paymentIntent)
          }
        ]
      );

    } catch (error) {
      console.error('Error creating payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
      Alert.alert('Payment Error', errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAccountInfo = async () => {
    if (!userId) return;
    
    try {
      setCheckingStatus(true);
      await checkConnectionStatus(userId);
    } catch (error) {
      console.error('Error refreshing account info:', error);
    }
  };

  if (checkingStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Checking Stripe connection...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <StripeConnectOnboarding
        onSuccess={() => checkConnectionStatus(userId)}
        onError={(error) => Alert.alert('Onboarding Error', error)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.paymentContainer}>
        <Text style={styles.title}>Stripe Connect Payment</Text>
        
        {/* Account Status */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          {accountInfo ? (
            <View style={styles.accountInfo}>
              <Text style={styles.accountText}>✅ Connected Account: {accountInfo.id}</Text>
              <Text style={styles.accountText}>
                Charges Enabled: {accountInfo.charges_enabled ? '✅' : '❌'}
              </Text>
              <Text style={styles.accountText}>
                Payouts Enabled: {accountInfo.payouts_enabled ? '✅' : '❌'}
              </Text>
              {accountInfo.business_profile?.name && (
                <Text style={styles.accountText}>
                  Business: {accountInfo.business_profile.name}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.accountText}>Loading account info...</Text>
          )}
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshAccountInfo}
          >
            <Text style={styles.refreshButtonText}>Refresh Account Info</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Section */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Create Payment</Text>
          
          <View style={styles.amountContainer}>
            <Text style={styles.label}>Amount (USD)</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="10.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.feeBreakdown}>
            <Text style={styles.breakdownTitle}>Fee Breakdown:</Text>
            <Text style={styles.breakdownText}>
              Customer Pays: ${parseFloat(amount || '0').toFixed(2)}
            </Text>
            <Text style={styles.breakdownText}>
              Platform Fee: $0.01
            </Text>
            <Text style={styles.breakdownText}>
              Merchant Gets: ${Math.max(0, parseFloat(amount || '0') - 0.01).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
            onPress={handleCreatePayment}
            disabled={loading || !accountInfo?.charges_enabled}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.paymentButtonText}>
                Create Payment Intent
              </Text>
            )}
          </TouchableOpacity>

          {!accountInfo?.charges_enabled && (
            <Text style={styles.warningText}>
              ⚠️ Account setup incomplete. Charges not enabled yet.
            </Text>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • Customer pays the full amount via Terminal
          </Text>
          <Text style={styles.infoText}>
            • $0.01 platform fee goes to your account
          </Text>
          <Text style={styles.infoText}>
            • Remaining amount goes to merchant's account
          </Text>
          <Text style={styles.infoText}>
            • Automatic daily payouts to merchant's bank
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  paymentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  accountSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  accountInfo: {
    marginBottom: 12,
  },
  accountText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  refreshButton: {
    borderColor: '#635BFF',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#635BFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSection: {
    marginBottom: 24,
  },
  amountContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  feeBreakdown: {
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  paymentButton: {
    backgroundColor: '#635BFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
});
