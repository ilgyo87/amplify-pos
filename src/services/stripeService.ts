import { initStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRIPE_SETTINGS_KEY = 'stripe_settings';

interface StripeSettings {
  publishableKey: string;
  secretKey?: string; // For backend payments
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

  // Process payment using stored secret key
  async processPayment(token: string, amount: number, description?: string, metadata?: any) {
    try {
      if (!this.isInitialized()) {
        throw new Error('Stripe not initialized');
      }

      const settings = await this.getStripeSettings();
      if (!settings?.secretKey) {
        throw new Error('Stripe secret key not configured');
      }

      console.log('Processing payment with stored secret key...');
      
      // Import Stripe for server-side usage
      const Stripe = (await import('stripe')).default;
      
      const stripe = new Stripe(settings.secretKey, {
        apiVersion: '2023-10-16',
      });

      // Validate amount (should be in cents)
      const amountInCents = Math.round(amount * 100);
      if (amountInCents < 50) { // Stripe minimum is $0.50
        throw new Error('Amount must be at least $0.50');
      }

      console.log(`Processing payment: $${amount} (${amountInCents} cents)`);

      // Create the charge
      const charge = await stripe.charges.create({
        amount: amountInCents,
        currency: 'usd',
        source: token,
        description: description || 'POS Transaction',
        metadata: metadata || {}
      });

      console.log('Payment successful:', charge.id);

      // Return success response
      return {
        success: true,
        chargeId: charge.id,
        amount: charge.amount / 100, // Convert back to dollars
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        receipt_url: charge.receipt_url
      };

    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        throw new Error(`Card was declined: ${error.message}`);
      }
      
      if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Invalid request: ${error.message}`);
      }
      
      throw new Error(error.message || 'Payment processing failed');
    }
  }
}

export const stripeService = new StripeService();
