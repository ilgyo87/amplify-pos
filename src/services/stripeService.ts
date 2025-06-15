import { initStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRIPE_SETTINGS_KEY = 'stripe_settings';

// Get Stripe Connect API endpoint from Amplify outputs
let STRIPE_CONNECT_API_ENDPOINT = '';

// Initialize endpoint on first use
const initializeEndpoint = async () => {
  if (!STRIPE_CONNECT_API_ENDPOINT) {
    const amplifyConfig = await import('../../amplify_outputs.json');
    STRIPE_CONNECT_API_ENDPOINT = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint || '';
  }
};

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

  async getStripeConnectAuthUrl(userId: string): Promise<{ url: string } | null> {
    try {
      // Use the direct Stripe Connect URL with your client ID
      const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_SVBQ4Xdq1CkP9yivzAT9KGviMk6HbfrW&scope=read_write&state=${encodeURIComponent(userId)}&redirect_uri=${encodeURIComponent('https://example.com/stripe-connect-callback')}`;
      
      console.log('Generated Stripe Connect URL:', stripeConnectUrl);
      return { url: stripeConnectUrl };
    } catch (error) {
      console.error('Error generating Stripe Connect URL:', error);
      return null;
    }
  }

  async handleStripeConnectCallback(code: string, userId: string): Promise<boolean> {
    try {
      await initializeEndpoint();
      if (!STRIPE_CONNECT_API_ENDPOINT) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      const baseUrl = STRIPE_CONNECT_API_ENDPOINT.endsWith('/') 
        ? STRIPE_CONNECT_API_ENDPOINT.slice(0, -1) 
        : STRIPE_CONNECT_API_ENDPOINT;

      const response = await fetch(`${baseUrl}/connect/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to process Stripe Connect callback:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to process Stripe Connect callback');
      }

      const data = await response.json();
      console.log('Stripe Connect callback processed successfully:', data);
      return true;
    } catch (error) {
      console.error('Error processing Stripe Connect callback:', error);
      return false;
    }
  }

  async getConnectedAccountInfo(userId: string) {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/account_info?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get account info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting connected account info:', error);
      throw error;
    }
  }

  async getStripeConnectionStatus(userId: string): Promise<boolean> {
    try {
      const accountInfo = await this.getConnectedAccountInfo(userId);
      return !!accountInfo.id;
    } catch (error) {
      // If we get a 404 or any error, assume not connected
      console.log('User not connected to Stripe:', error);
      return false;
    }
  }

  async createConnectionToken(userId: string): Promise<string | null> {
    try {
      await initializeEndpoint();
      if (!STRIPE_CONNECT_API_ENDPOINT) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      const baseUrl = STRIPE_CONNECT_API_ENDPOINT.endsWith('/') 
        ? STRIPE_CONNECT_API_ENDPOINT.slice(0, -1) 
        : STRIPE_CONNECT_API_ENDPOINT;

      const response = await fetch(`${baseUrl}/connection_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create connection token:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create connection token');
      }

      const data = await response.json();
      return data.secret;
    } catch (error) {
      console.error('Error creating connection token:', error);
      return null;
    }
  }

  // Reinitialize Stripe with current settings
  async reinitialize() {
    this.initialized = false;
    return await this.initialize();
  }

  async processPayment(amount: number, currency: string = 'usd', description?: string): Promise<any> {
    try {
      console.log('Processing payment via backend API...');
      
      // All payment processing should go through the backend Lambda function
      // This avoids importing server-side Stripe libraries in React Native
      await initializeEndpoint();
      
      if (!STRIPE_CONNECT_API_ENDPOINT) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      // Get current user ID (you may want to get this from your auth system)
      const userId = 'demo-user'; // Replace with actual user ID from auth

      // Validate amount (should be in cents)
      const amountInCents = Math.round(amount * 100);
      if (amountInCents < 50) { // Stripe minimum is $0.50
        throw new Error('Amount must be at least $0.50');
      }

      console.log(`Creating payment intent via backend: $${amount} (${amountInCents} cents)`);

      // Create payment intent through backend API
      const response = await fetch(`${STRIPE_CONNECT_API_ENDPOINT}/create_payment_intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency,
          userId,
          description: description || 'POS Terminal Payment',
          application_fee_amount: 1, // $0.01 platform fee
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const paymentIntent = await response.json();
      console.log('Payment intent created successfully:', paymentIntent.id);

      return {
        success: true,
        paymentIntent,
        message: 'Payment intent created successfully'
      };

    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  // Create Terminal payment with Stripe Connect (direct charge model)
  async createTerminalPayment(
    amount: number, 
    currency: string = 'usd',
    userId: string,
    description?: string,
    metadata?: any
  ) {
    try {
      await initializeEndpoint();
      if (!STRIPE_CONNECT_API_ENDPOINT) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      // Platform fee: $0.01 (1 cent in smallest currency unit)
      const platformFeeAmount = 1;
      
      // Validate amount (minimum after platform fee)
      const amountInCents = Math.round(amount * 100);
      if (amountInCents < 51) { // Minimum $0.51 to allow for $0.01 fee
        throw new Error('Amount must be at least $0.51 to cover platform fee');
      }

      const baseUrl = STRIPE_CONNECT_API_ENDPOINT.endsWith('/') 
        ? STRIPE_CONNECT_API_ENDPOINT.slice(0, -1) 
        : STRIPE_CONNECT_API_ENDPOINT;

      const response = await fetch(`${baseUrl}/create_payment_intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency,
          userId,
          description: description || 'POS Terminal Payment',
          application_fee_amount: platformFeeAmount,
          metadata: {
            platform: 'amplify_pos',
            payment_type: 'terminal',
            ...metadata
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create payment intent:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const paymentIntent = await response.json();
      
      console.log('Terminal payment intent created:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        application_fee_amount: paymentIntent.application_fee_amount,
        on_behalf_of: paymentIntent.on_behalf_of
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating Terminal payment:', error);
      throw error;
    }
  }

  async getBaseUrl() {
    await initializeEndpoint();
    if (!STRIPE_CONNECT_API_ENDPOINT) {
      throw new Error('Stripe Connect API endpoint not configured');
    }

    return STRIPE_CONNECT_API_ENDPOINT.endsWith('/') 
      ? STRIPE_CONNECT_API_ENDPOINT.slice(0, -1) 
      : STRIPE_CONNECT_API_ENDPOINT;
  }
}

export const stripeService = new StripeService();
