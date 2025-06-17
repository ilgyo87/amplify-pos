import { initStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stripeLocationService } from './stripeLocationService';

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
      // Use the backend endpoint to get the properly configured Stripe Connect URL
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/connect/authorize?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get authorization URL');
      }
      
      console.log('Generated Stripe Connect URL from backend:', data.url);
      return { url: data.url };
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
      console.log('Checking Stripe connection for user:', userId);
      const accountInfo = await this.getConnectedAccountInfo(userId);
      console.log('Account info response:', accountInfo);
      return !!accountInfo.id;
    } catch (error: any) {
      // If we get a 404 or any error, assume not connected
      console.log('User not connected to Stripe:', error.message || error);
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

      console.log(`Creating connection token at: ${baseUrl}/connection_token`);
      const response = await fetch(`${baseUrl}/connection_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const responseText = await response.text();
      console.log('Connection token response:', response.status, responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('Failed to create connection token:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create connection token');
      }

      const data = JSON.parse(responseText);
      if (!data.secret) {
        console.error('Connection token response missing secret:', data);
        throw new Error('Connection token response missing secret');
      }
      
      // Save location ID if provided
      if (data.location_id) {
        await stripeLocationService.setLocationId(data.location_id);
      }
      
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

  async processPayment(tokenOrAmount: string | number, amountOrCurrency?: number | string, descriptionOrDescription?: string, metadata?: any): Promise<any> {
    // Handle overloaded method signatures
    let token: string | undefined;
    let amount: number;
    let currency: string = 'usd';
    let description: string | undefined;
    
    if (typeof tokenOrAmount === 'string') {
      // New signature: processPayment(token, amount, description, metadata)
      token = tokenOrAmount;
      amount = amountOrCurrency as number;
      description = descriptionOrDescription;
    } else {
      // Old signature: processPayment(amount, currency, description)
      amount = tokenOrAmount;
      currency = (amountOrCurrency as string) || 'usd';
      description = descriptionOrDescription;
    }
    
    // If we have a token, use the Lambda payment endpoint
    if (token) {
      try {
        console.log('Processing payment with token via Lambda...');
        const { getCurrentUser } = await import('aws-amplify/auth');
        const currentUser = await getCurrentUser();
        const userId = currentUser.userId;
        
        const paymentEndpoint = await this.getPaymentEndpoint();
        const response = await fetch(paymentEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            amount,
            description,
            metadata,
            userId // Include userId for destination charges
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment processing failed');
        }

        const result = await response.json();
        console.log('Payment processed successfully:', result.chargeId);
        return result;
      } catch (error: any) {
        console.error('Payment processing error:', error);
        throw error;
      }
    }
    
    // Original implementation for payment intents (kept for backward compatibility)
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

  async getPaymentEndpoint(): Promise<string> {
    const amplifyConfig = await import('../../amplify_outputs.json');
    const customConfig = amplifyConfig.default.custom as any;
    const paymentEndpoint = customConfig?.stripePaymentEndpoint;
    if (!paymentEndpoint) {
      // Fallback to a known endpoint if not configured yet
      console.warn('Stripe payment endpoint not found in config, using fallback');
      // You'll need to update this with your actual payment Lambda URL
      throw new Error('Stripe payment endpoint not configured');
    }
    return paymentEndpoint;
  }
}

export const stripeService = new StripeService();
