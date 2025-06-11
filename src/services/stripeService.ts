import { initStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRIPE_SETTINGS_KEY = 'stripe_settings';

interface StripeSettings {
  publishableKey: string;
  merchantId?: string; // For Apple Pay
}

// Type for callbacks when Stripe settings change
type StripeSettingsChangeCallback = (settings: StripeSettings | null) => void;

class StripeService {
  private initialized = false;
  private currentSettings: StripeSettings | null = null;
  private changeCallbacks: StripeSettingsChangeCallback[] = [];

  async initialize() {
    try {
      const settings = await this.getStripeSettings();
      if (settings?.publishableKey) {
        await initStripe({
          publishableKey: settings.publishableKey,
          merchantIdentifier: settings.merchantId,
        });
        this.initialized = true;
        this.currentSettings = settings;
        console.log('Stripe initialized with key:', settings.publishableKey.substring(0, 12) + '...');
        return true;
      }
      console.log('No Stripe settings found, skipping initialization');
      return false;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return false;
    }
  }

  async saveStripeSettings(settings: StripeSettings) {
    try {
      await AsyncStorage.setItem(STRIPE_SETTINGS_KEY, JSON.stringify(settings));
      this.currentSettings = settings;
      
      // Notify callbacks about settings change
      this.changeCallbacks.forEach(callback => callback(settings));
      
      console.log('Stripe settings saved successfully');
    } catch (error) {
      console.error('Failed to save Stripe settings:', error);
      throw error;
    }
  }

  async getStripeSettings(): Promise<StripeSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(STRIPE_SETTINGS_KEY);
      const parsed = settings ? JSON.parse(settings) : null;
      this.currentSettings = parsed;
      return parsed;
    } catch (error) {
      console.error('Failed to get Stripe settings:', error);
      return null;
    }
  }

  async clearStripeSettings() {
    try {
      await AsyncStorage.removeItem(STRIPE_SETTINGS_KEY);
      this.currentSettings = null;
      this.initialized = false;
      
      // Notify callbacks about settings change
      this.changeCallbacks.forEach(callback => callback(null));
      
      console.log('Stripe settings cleared');
    } catch (error) {
      console.error('Failed to clear Stripe settings:', error);
      throw error;
    }
  }

  getCurrentSettings(): StripeSettings | null {
    return this.currentSettings;
  }

  isInitialized(): boolean {
    return this.initialized && this.currentSettings !== null;
  }

  // Subscribe to settings changes
  onSettingsChange(callback: StripeSettingsChangeCallback) {
    this.changeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  // Reinitialize Stripe with current settings
  async reinitialize() {
    this.initialized = false;
    return await this.initialize();
  }

  // Process payment via backend Lambda function
  async processPayment(token: string, amount: number, description?: string, metadata?: any) {
    try {
      if (!this.isInitialized()) {
        throw new Error('Stripe not initialized');
      }

      // For now, we'll construct the endpoint manually
      // In a real deployment, you'd get this from Amplify config
      // const { Amplify } = await import('aws-amplify');
      // const config = Amplify.getConfig();
      const apiEndpoint = `https://your-api-gateway-url.execute-api.region.amazonaws.com/payment/stripe`;
      
      console.log('Processing payment through backend...');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          amount,
          description,
          metadata
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment processing failed');
      }

      console.log('Payment processed successfully:', result.chargeId);
      return result;

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
