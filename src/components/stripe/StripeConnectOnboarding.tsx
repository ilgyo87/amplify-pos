import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { stripeService } from '../../services/stripe';

interface StripeConnectOnboardingProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripeConnectOnboarding({ onSuccess, onError }: StripeConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const user = await getCurrentUser();
      const connected = await stripeService.getStripeConnectionStatus();
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      
      // Get the authorization URL from your backend
      const authData = await stripeService.getStripeConnectAuthUrl(user.userId);
      
      if (!authData?.url) {
        throw new Error('Failed to get authorization URL');
      }

      // Open the Stripe Connect onboarding flow
      const canOpen = await Linking.canOpenURL(authData.url);
      if (canOpen) {
        await Linking.openURL(authData.url);
      } else {
        throw new Error('Cannot open Stripe Connect URL');
      }
      
    } catch (error) {
      console.error('Error starting onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start onboarding';
      Alert.alert('Error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      // For now, open the general Stripe Dashboard
      // In a full implementation, you'd get the specific dashboard URL for the connected account
      const dashboardUrl = 'https://dashboard.stripe.com/';
      const canOpen = await Linking.canOpenURL(dashboardUrl);
      if (canOpen) {
        await Linking.openURL(dashboardUrl);
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
      Alert.alert('Error', 'Failed to open Stripe Dashboard');
    }
  };

  const handleRefreshStatus = async () => {
    setCheckingStatus(true);
    await checkConnectionStatus();
    if (isConnected) {
      onSuccess?.();
    }
  };

  if (checkingStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Checking connection status...</Text>
      </View>
    );
  }

  if (isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Stripe Connected!</Text>
          <Text style={styles.successText}>
            Your account is connected and ready to accept payments.
          </Text>
          
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={handleOpenDashboard}
          >
            <Text style={styles.dashboardButtonText}>Open Stripe Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshStatus}
          >
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.onboardingContainer}>
        <Text style={styles.title}>Connect with Stripe</Text>
        <Text style={styles.description}>
          Connect your Stripe account to start accepting payments. You'll be redirected to Stripe to complete the setup process.
        </Text>
        
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>What you'll get:</Text>
          <Text style={styles.benefit}>• Direct payments to your account</Text>
          <Text style={styles.benefit}>• Automatic daily payouts</Text>
          <Text style={styles.benefit}>• Full transaction reporting</Text>
          <Text style={styles.benefit}>• Dispute and refund management</Text>
        </View>

        <TouchableOpacity
          style={[styles.connectButton, loading && styles.connectButtonDisabled]}
          onPress={handleStartOnboarding}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.connectButtonText}>Connect with Stripe</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshStatus}
        >
          <Text style={styles.refreshButtonText}>Check Connection Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  onboardingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  benefit: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 22,
  },
  connectButton: {
    backgroundColor: '#635BFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  connectButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    backgroundColor: '#00D924',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    borderColor: '#635BFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#635BFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D924',
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
