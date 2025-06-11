import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripeService } from '../../services/stripeService';

export function StripeSettingsCard() {
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadStripeSettings();
  }, []);

  const loadStripeSettings = async () => {
    try {
      const settings = await stripeService.getStripeSettings();
      if (settings) {
        setPublishableKey(settings.publishableKey);
        setSecretKey(settings.secretKey || '');
        setMerchantId(settings.merchantId || '');
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Failed to load Stripe settings:', error);
      Alert.alert('Error', 'Failed to load Stripe settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!publishableKey.trim()) {
      Alert.alert('Error', 'Publishable key is required');
      return;
    }

    if (!secretKey.trim()) {
      Alert.alert('Error', 'Secret key is required for processing payments');
      return;
    }

    try {
      setIsLoading(true);
      await stripeService.saveStripeSettings({
        publishableKey: publishableKey.trim(),
        secretKey: secretKey.trim(),
        merchantId: merchantId.trim() || undefined,
      });
      
      // Reinitialize Stripe with new settings
      const initialized = await stripeService.reinitialize();
      if (initialized) {
        setIsConfigured(true);
        Alert.alert('Success', 'Stripe settings saved and initialized successfully');
      } else {
        Alert.alert('Warning', 'Settings saved but failed to initialize Stripe. Please check your publishable key.');
      }
    } catch (error) {
      console.error('Failed to save Stripe settings:', error);
      Alert.alert('Error', 'Failed to save Stripe settings');
    } finally {
      setIsLoading(false);
    }
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
          <View style={[styles.statusIndicator, isConfigured && styles.statusConfigured]}>
            <Text style={[styles.statusText, isConfigured && styles.statusTextConfigured]}>
              {isConfigured ? 'Configured' : 'Not Configured'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Publishable Key</Text>
          <TextInput
            style={styles.input}
            value={publishableKey}
            onChangeText={setPublishableKey}
            placeholder="pk_test_..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Secret Key</Text>
          <TextInput
            style={styles.input}
            value={secretKey}
            onChangeText={setSecretKey}
            placeholder="sk_test_..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={true}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Merchant ID (Optional, for Apple Pay)</Text>
          <TextInput
            style={styles.input}
            value={merchantId}
            onChangeText={setMerchantId}
            placeholder="merchant.com.example..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
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
});
