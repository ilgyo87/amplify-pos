import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StripeConnectPaymentFlow } from './StripeConnectPaymentFlow';

export function StripeConnectDemo() {
  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    // Handle successful payment - maybe navigate to success screen
    // or update your local state/database
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    // Handle payment error - show user-friendly message
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stripe Connect Integration</Text>
        <Text style={styles.subtitle}>
          Multi-tenant POS with Direct Charges & Platform Fees
        </Text>
      </View>

      <View style={styles.content}>
        <StripeConnectPaymentFlow
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Integration Features:</Text>
        <Text style={styles.featureText}>✅ Embedded Stripe Connect onboarding</Text>
        <Text style={styles.featureText}>✅ Direct charges to merchant accounts</Text>
        <Text style={styles.featureText}>✅ $0.01 platform fee per transaction</Text>
        <Text style={styles.featureText}>✅ Real-time account status checking</Text>
        <Text style={styles.featureText}>✅ Stripe Dashboard access for merchants</Text>
        <Text style={styles.featureText}>✅ Terminal payment intent creation</Text>
        
        <Text style={styles.techTitle}>Technical Implementation:</Text>
        <Text style={styles.techText}>• Express accounts for quick onboarding</Text>
        <Text style={styles.techText}>• Direct charge model with application fees</Text>
        <Text style={styles.techText}>• AWS Lambda backend with DynamoDB storage</Text>
        <Text style={styles.techText}>• React Native with Stripe Terminal SDK</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    backgroundColor: '#635BFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E6E6FA',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  techTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  techText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
});
