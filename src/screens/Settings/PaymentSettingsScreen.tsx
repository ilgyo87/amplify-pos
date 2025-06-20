import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../BaseScreen';
import { StripeSettingsCard } from '../../components/settings/StripeSettingsCard';
import { StripeTerminalSettingsCard } from '../../components/settings/StripeTerminalSettingsCard';
import { businessService } from '../../database/services/businessService';
import { BusinessDocument } from '../../database/schemas/business';

export default function PaymentSettingsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('0');
  const [currentBusiness, setCurrentBusiness] = useState<BusinessDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      const businesses = await businessService.getAllBusinesses();
      if (businesses.length > 0) {
        const business = businesses[0];
        setCurrentBusiness(business);
        const rate = business.taxRate || 0;
        setTaxEnabled(rate > 0);
        setTaxRate(rate.toString());
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const handleTaxToggle = async (value: boolean) => {
    setTaxEnabled(value);
    if (!value) {
      // If disabling tax, set rate to 0
      await saveTaxRate(0);
    }
  };

  const saveTaxRate = async (rate: number) => {
    if (!currentBusiness) return;
    
    setIsSaving(true);
    try {
      const updated = await businessService.updateBusinessField(currentBusiness.id, {
        taxRate: rate
      });
      if (updated) {
        Alert.alert('Success', 'Tax settings updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update tax settings');
      }
    } catch (error) {
      console.error('Error saving tax rate:', error);
      Alert.alert('Error', 'Failed to update tax settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaxRateChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setTaxRate(formatted);
  };

  const handleTaxRateSubmit = async () => {
    const rate = parseFloat(taxRate) || 0;
    if (rate < 0 || rate > 100) {
      Alert.alert('Invalid Tax Rate', 'Tax rate must be between 0 and 100');
      return;
    }
    await saveTaxRate(rate / 100); // Convert percentage to decimal
  };

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Accept credit and debit cards',
      icon: 'card',
      color: '#635bff',
      enabled: true,
      component: <StripeSettingsCard />
    },
    {
      id: 'cash',
      name: 'Cash',
      description: 'Accept cash payments',
      icon: 'cash',
      color: '#28a745',
      enabled: true,
      builtin: true
    },
    {
      id: 'check',
      name: 'Check',
      description: 'Accept check payments',
      icon: 'document-text',
      color: '#6c757d',
      enabled: true,
      builtin: true
    },
    {
      id: 'account',
      name: 'Account Credit',
      description: 'Customer account payments',
      icon: 'person',
      color: '#17a2b8',
      enabled: true,
      builtin: true
    }
  ];

  return (
    <BaseScreen title="Payment Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <Text style={styles.headerSubtitle}>
            Configure how customers can pay for orders
          </Text>
        </View>
        
        {/* Information Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>Two Ways to Accept Card Payments</Text>
            <Text style={styles.infoBannerDescription}>
              1. Enter your own Stripe API keys for direct processing{'\n'}
              2. Use Stripe Connect (if available) for simplified setup
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Payments</Text>
          <Text style={styles.sectionSubtitle}>
            Online payment processing for credit and debit cards
          </Text>
          
          {paymentMethods
            .filter(method => method.id === 'stripe')
            .map(method => (
              <View key={method.id} style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodHeader}>
                  <View style={[styles.paymentMethodIcon, { backgroundColor: `${method.color}20` }]}>
                    <Ionicons name={method.icon as any} size={24} color={method.color} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                  </View>
                  <View style={[styles.statusIndicator, method.enabled && styles.statusEnabled]}>
                    <Text style={[styles.statusText, method.enabled && styles.statusTextEnabled]}>
                      {method.enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                
                {method.component}
              </View>
            ))
          }
          
          {/* Add Terminal Settings Card */}
          <StripeTerminalSettingsCard />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Settings</Text>
          <Text style={styles.sectionSubtitle}>
            Configure sales tax for your business
          </Text>
          
          <View style={styles.paymentMethodCard}>
            <View style={styles.taxSettingsContent}>
              <View style={styles.taxToggleRow}>
                <View style={styles.taxToggleInfo}>
                  <Text style={styles.taxToggleLabel}>Enable Sales Tax</Text>
                  <Text style={styles.taxToggleDescription}>
                    Add sales tax to customer orders
                  </Text>
                </View>
                <Switch
                  value={taxEnabled}
                  onValueChange={handleTaxToggle}
                  trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                  thumbColor={taxEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              {taxEnabled && (
                <View style={styles.taxRateSection}>
                  <Text style={styles.taxRateLabel}>Tax Rate (%)</Text>
                  <View style={styles.taxRateInputRow}>
                    <TextInput
                      style={styles.taxRateInput}
                      value={taxRate}
                      onChangeText={handleTaxRateChange}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      maxLength={6}
                      editable={!isSaving}
                    />
                    <TouchableOpacity
                      style={[styles.saveTaxButton, isSaving && styles.saveTaxButtonDisabled]}
                      onPress={handleTaxRateSubmit}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveTaxButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.taxRateHelp}>
                    Enter the tax percentage (e.g., 8.75 for 8.75%)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Payment Processing</Text>
              <Text style={styles.infoText}>
                All payment methods are available during checkout. Configure Stripe to accept card payments with real-time processing.
              </Text>
            </View>
          </View>
          
          {/* Temporary debug button */}
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: '#fff5f5', borderColor: '#ffcccc', marginTop: 16 }]}
            onPress={async () => {
              try {
                const { clearStripeCache } = await import('../../utils/clearStripeCache');
                await clearStripeCache();
                Alert.alert(
                  'Cache Cleared',
                  'Stripe cache has been cleared. Please restart the app completely.',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to clear cache');
              }
            }}
          >
            <Ionicons name="trash" size={24} color="#dc3545" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: '#dc3545' }]}>Clear Stripe Cache</Text>
              <Text style={[styles.infoText, { color: '#dc3545' }]}>
                Use this if you're having issues with mismatched test/live modes
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d47a1',
    marginBottom: 4,
  },
  infoBannerDescription: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  statusEnabled: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  statusTextEnabled: {
    color: '#155724',
  },
  builtinMethodDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  featureList: {
    paddingTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#b3d9ff',
  } as any,
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
  taxSettingsContent: {
    padding: 20,
  },
  taxToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  taxToggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  taxToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  taxToggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  taxRateSection: {
    paddingTop: 20,
  },
  taxRateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  taxRateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxRateInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  saveTaxButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  saveTaxButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveTaxButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  taxRateHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});