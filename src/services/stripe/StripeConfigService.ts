import { initStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRIPE_SETTINGS_KEY = 'stripe_settings';

export interface StripeSettings {
  publishableKey: string;
  secretKey?: string;
  merchantId?: string;
}

type StripeSettingsChangeCallback = (settings: StripeSettings | null) => void;

export class StripeConfigService {
  private initialized = false;
  private currentSettings: StripeSettings | null = null;
  private changeCallbacks: StripeSettingsChangeCallback[] = [];

  async initialize(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      if (settings?.publishableKey) {
        await initStripe({
          publishableKey: settings.publishableKey,
          merchantIdentifier: settings.merchantId,
        });
        this.initialized = true;
        this.currentSettings = settings;
        console.log('Stripe initialized with key:', settings.publishableKey.substring(0, 12) + '...');
        console.log('Key type:', settings.publishableKey.startsWith('pk_test') ? 'TEST MODE' : 'LIVE MODE');
        return true;
      }
      console.log('No Stripe settings found, skipping initialization');
      return false;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return false;
    }
  }

  async saveSettings(settings: StripeSettings): Promise<void> {
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

  async getSettings(): Promise<StripeSettings | null> {
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

  async clearSettings(): Promise<void> {
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
    return this.initialized;
  }

  onSettingsChange(callback: StripeSettingsChangeCallback): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      this.changeCallbacks = this.changeCallbacks.filter(cb => cb !== callback);
    };
  }

  async reinitialize(): Promise<boolean> {
    this.initialized = false;
    return await this.initialize();
  }
}

export const stripeConfigService = new StripeConfigService();