import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripeService } from '../../services/stripeService';
import { getCurrentUser } from 'aws-amplify/auth';

export function StripeSettingsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStripeSettings();
  }, []);

  const loadStripeSettings = async () => {
    try {
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser.userId;
      setUserId(currentUserId);

      const connectionStatus = await stripeService.getStripeConnectionStatus(currentUserId);
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
    try {
      setIsLoading(true);
      const authData = await stripeService.getStripeConnectAuthUrl(userId);
      if (authData && authData.url) {
        await Linking.openURL(authData.url);
        Alert.alert(
          'Stripe Connect',
          'You will be redirected to Stripe to complete the connection. Please return to the app when finished.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Set up a listener for when the user returns to check connection status
                setTimeout(() => {
                  loadStripeSettings();
                }, 2000);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not get Stripe Connect URL. Please try again.');
      }
    } catch (error: any) {
      console.error('Stripe Connect error:', error);
      Alert.alert('Error', error.message || 'Could not start Stripe Connect onboarding.');
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
            // TODO: Implement disconnect functionality
            console.log('Disconnect Stripe account');
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
