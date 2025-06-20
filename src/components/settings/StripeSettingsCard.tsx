import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripeService } from '../../services/stripe';
import { getCurrentUser } from 'aws-amplify/auth';
import { useFocusEffect } from '@react-navigation/native';

export function StripeSettingsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStripeSettings();
    
    // Listen for app state changes
    const appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Reload settings when app comes to foreground
        loadStripeSettings();
      }
    });
    
    return () => {
      appStateListener.remove();
    };
  }, []);
  
  // Reload settings when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadStripeSettings();
      
      // Also set up an interval to check for updates
      const interval = setInterval(() => {
        if (!isConnected) {
          loadStripeSettings();
        }
      }, 2000); // Check every 2 seconds if not connected
      
      return () => clearInterval(interval);
    }, [isConnected])
  );

  const loadStripeSettings = async () => {
    try {
      console.log('Loading Stripe settings...');
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser.userId;
      console.log('Current user ID:', currentUserId);
      setUserId(currentUserId);

      const connectionStatus = await stripeService.getStripeConnectionStatus();
      console.log('Stripe connection status:', connectionStatus);
      setIsConnected(connectionStatus);
    } catch (error) {
      console.error('Failed to load Stripe settings:', error);
      Alert.alert('Error', 'Failed to load Stripe settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWithStripe = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID is missing. Cannot connect to Stripe.');
      return;
    }
    
    // Check if we have existing Stripe settings
    const existingSettings = await stripeService.getStripeSettings();
    if (existingSettings?.publishableKey) {
      Alert.alert(
        'Existing Configuration',
        'You already have Stripe configured with your own API keys. Connecting with Stripe Connect will replace this configuration. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              await proceedWithStripeConnect();
            }
          }
        ]
      );
    } else {
      await proceedWithStripeConnect();
    }
  };
  
  const proceedWithStripeConnect = async () => {
    try {
      setIsLoading(true);
      
      if (!userId) {
        Alert.alert('Error', 'User not authenticated. Please log in and try again.');
        setIsLoading(false);
        return;
      }
      
      // First, clear any existing settings to ensure clean state
      await stripeService.clearStripeSettings();
      
      const authData = await stripeService.getStripeConnectAuthUrl(userId);
      if (authData && authData.url) {
        await Linking.openURL(authData.url);
        // Don't show alert, just let the redirect happen
        // The app state listener and focus effect will handle reloading when user returns
      } else {
        Alert.alert(
          'Stripe Connect Not Available', 
          'The platform has not configured Stripe Connect. You can still use Stripe by entering your own API keys in Payment Settings.',
          [
            { text: 'OK' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Stripe Connect error:', error);
      if (error.message?.includes('not configured')) {
        Alert.alert(
          'Stripe Connect Not Available', 
          'The platform has not configured Stripe Connect. You can still use Stripe by entering your own API keys in Payment Settings.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Could not start Stripe Connect onboarding.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectStripe = async () => {
    Alert.alert(
      'Disconnect Stripe',
      'Are you sure you want to disconnect your Stripe account? This will prevent you from processing payments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Disconnect from backend and clear local settings
              const success = await stripeService.disconnectStripeAccount(userId!);
              
              if (success) {
                setIsConnected(false);
                Alert.alert('Success', 'Stripe account disconnected successfully.');
              } else {
                throw new Error('Failed to disconnect from backend');
              }
            } catch (error) {
              console.error('Failed to disconnect:', error);
              Alert.alert('Error', 'Failed to disconnect Stripe account');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="card" size={24} color="#007AFF" />
          <Text style={styles.title}>Stripe Payments</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, isConnected && styles.statusConfigured]}>
            <Text style={[styles.statusText, isConnected && styles.statusTextConfigured]}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {isConnected ? (
          <View>
            <Text style={styles.infoText}>Your Stripe account is connected.</Text>
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnectStripe}>
              <Text style={styles.saveButtonText}>Disconnect Stripe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.saveButton} onPress={handleConnectWithStripe}>
            <Text style={styles.saveButtonText}>Connect with Stripe</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.infoTextSmall}>
          Connecting your Stripe account allows you to securely process payments through our platform.
          You will be redirected to Stripe to authorize the connection.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusConfigured: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusTextConfigured: {
    color: '#4caf50',
  },
  content: {
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoTextSmall: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  disconnectButton: {
    backgroundColor: '#d9534f', // A red color for disconnect/danger
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
});
