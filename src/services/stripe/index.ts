// Re-export all Stripe services for convenient imports
export { stripeConfigService } from './StripeConfigService';
export { stripePaymentService } from './StripePaymentService';
export { stripeConnectService } from './StripeConnectService';
export { stripeLocationService } from './StripeLocationService';
export { stripeTerminalService } from './StripeTerminalService';

// Export types
export type { StripeSettings } from './StripeConfigService';

// Legacy export for backward compatibility
import { stripeConfigService } from './StripeConfigService';
import { stripePaymentService } from './StripePaymentService';
import { stripeConnectService } from './StripeConnectService';
import { stripeLocationService } from './StripeLocationService';

class StripeService {
  // Config methods
  initialize = stripeConfigService.initialize.bind(stripeConfigService);
  saveStripeSettings = stripeConfigService.saveSettings.bind(stripeConfigService);
  getStripeSettings = stripeConfigService.getSettings.bind(stripeConfigService);
  clearStripeSettings = stripeConfigService.clearSettings.bind(stripeConfigService);
  getCurrentSettings = stripeConfigService.getCurrentSettings.bind(stripeConfigService);
  isInitialized = async () => {
    // Check if traditional Stripe SDK is initialized OR if Stripe Connect is connected
    const configInitialized = stripeConfigService.isInitialized();
    const connectStatus = await stripeConnectService.isConnected();
    return configInitialized || connectStatus;
  };
  onSettingsChange = stripeConfigService.onSettingsChange.bind(stripeConfigService);
  reinitialize = stripeConfigService.reinitialize.bind(stripeConfigService);
  
  // Payment methods
  processPayment = stripePaymentService.processPayment.bind(stripePaymentService);
  refundPayment = stripePaymentService.refundPayment.bind(stripePaymentService);
  
  // Process payment directly with card details (for Stripe Connect)
  async processConnectPayment(params: {
    cardNumber: string;
    expMonth: string;
    expYear: string;
    cvc: string;
    amount: number;
    description?: string;
    metadata?: any;
  }): Promise<{ chargeId: string }> {
    // For Stripe Connect, we can't use card details directly from the frontend
    // This would require PCI compliance. Instead, we should use Stripe Elements
    // or the payment method should be handled differently.
    
    // For now, throw an error indicating this approach won't work
    throw new Error('Direct card processing requires PCI compliance. Please use the standard card payment option with Stripe Elements.');
  }
  
  // Connect methods - using the correct method names
  getStripeConnectAuthUrl = async (userId: string) => {
    try {
      // Get the auth URL from the Lambda function
      const amplifyConfig = await import('../../../amplify_outputs.json');
      const stripeEndpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!stripeEndpoint) {
        throw new Error('Stripe Connect endpoint not configured');
      }

      const response = await fetch(`${stripeEndpoint}/connect/authorize?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get authorization URL');
      }
      
      return { url: data.url };
    } catch (error) {
      console.error('Error getting Stripe auth URL:', error);
      throw error;
    }
  };
  getStripeConnectionStatus = stripeConnectService.isConnected.bind(stripeConnectService);
  handleStripeConnectCallback = stripeConnectService.handleCallback.bind(stripeConnectService);
  
  // Location methods  
  getLocationId = stripeLocationService.getLocationId.bind(stripeLocationService);
  setLocationId = stripeLocationService.setLocationId.bind(stripeLocationService);
  
  // Get platform publishable key from backend
  async getPlatformPublishableKey(): Promise<{ publishableKey: string } | null> {
    try {
      const amplifyConfig = await import('../../../amplify_outputs.json');
      const endpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!endpoint) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

      const response = await fetch(`${baseUrl}/platform_key`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting platform key:', error);
      return null;
    }
  }
  
  // New disconnect method
  async disconnectStripeAccount(userId: string): Promise<boolean> {
    try {
      const amplifyConfig = await import('../../../amplify_outputs.json');
      const endpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!endpoint) {
        throw new Error('Stripe Connect API endpoint not configured');
      }

      const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

      console.log(`Disconnecting Stripe account at: ${baseUrl}/disconnect`);
      const response = await fetch(`${baseUrl}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      // Clear local settings after successful backend disconnect
      await this.clearStripeSettings();
      
      return true;
    } catch (error) {
      console.error('Error disconnecting Stripe account:', error);
      return false;
    }
  }
  
  // Legacy methods for compatibility
  async getConnectedAccountInfo(userId: string) {
    const isConnected = await stripeConnectService.isConnected();
    return isConnected ? { id: 'connected' } : null;
  }
  
  async createConnectionToken(userId: string) {
    try {
      const amplifyConfig = await import('../../../amplify_outputs.json');
      const endpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!endpoint) {
        console.error('[STRIPE] No Stripe Connect endpoint configured');
        return null;
      }

      const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      console.log('[STRIPE] Fetching connection token from backend...');

      const response = await fetch(`${baseUrl}/connection_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch connection token');
      }

      const data = await response.json();
      return data.secret;
    } catch (error) {
      console.error('[STRIPE] Failed to fetch connection token:', error);
      return null;
    }
  }
}

export const stripeService = new StripeService();