import { Linking } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';

// This should be configured in your environment variables
const STRIPE_CONNECT_CLIENT_ID = '';

export class StripeConnectService {
  private static instance: StripeConnectService;
  private pendingCallback: ((success: boolean) => void) | null = null;

  public static getInstance(): StripeConnectService {
    if (!StripeConnectService.instance) {
      StripeConnectService.instance = new StripeConnectService();
    }
    return StripeConnectService.instance;
  }

  /**
   * Initiates Stripe Connect OAuth flow using in-app browser
   */
  async initiateStripeConnect(): Promise<boolean> {
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser.userId;

      // Use your Lambda endpoint to get the OAuth URL
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

      console.log('Opening Stripe Connect URL:', data.url);
      
      // Open the URL in the default browser
      const supported = await Linking.canOpenURL(data.url);
      if (supported) {
        await Linking.openURL(data.url);
        return true;
      } else {
        throw new Error('Cannot open Stripe Connect URL');
      }
    } catch (error) {
      console.error('Error initiating Stripe Connect:', error);
      return false;
    }
  }

  /**
   * Handles the OAuth callback from deep link
   */
  async handleCallback(code: string, state: string): Promise<boolean> {
    try {
      console.log('Processing Stripe Connect callback...');
      
      // Get your Lambda endpoint
      const amplifyConfig = await import('../../../amplify_outputs.json');
      const stripeEndpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!stripeEndpoint) {
        throw new Error('Stripe Connect endpoint not configured');
      }

      // Send the code to your Lambda function
      const callbackUrl = `${stripeEndpoint.replace(/\/$/, '')}/connect/callback`;
      console.log(`Calling Lambda endpoint: ${callbackUrl}`);
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          userId: state, // state contains the userId
        }),
      });

      console.log(`Lambda response status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.log(`Lambda response body: ${responseText.substring(0, 200)}...`);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Lambda response as JSON:', parseError);
        throw new Error(`Lambda returned non-JSON response: ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process callback');
      }

      console.log('Stripe Connect setup completed successfully!');
      
      // Notify any pending callbacks
      if (this.pendingCallback) {
        this.pendingCallback(true);
        this.pendingCallback = null;
      }
      
      return true;
    } catch (error) {
      console.error('Error processing Stripe Connect callback:', error);
      
      if (this.pendingCallback) {
        this.pendingCallback(false);
        this.pendingCallback = null;
      }
      
      return false;
    }
  }

  /**
   * Checks if user has connected their Stripe account
   */
  async isConnected(): Promise<boolean> {
    try {
      // Try to get the current user - this will throw if user is not authenticated
      let currentUser: { userId: string };
      try {
        currentUser = await getCurrentUser();
      } catch (authError) {
        // User is not authenticated yet, return false silently
        return false;
      }
      
      const userId = currentUser.userId;

      const amplifyConfig = await import('../../../amplify_outputs.json');
      const stripeEndpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!stripeEndpoint) {
        return false;
      }

      const response = await fetch(`${stripeEndpoint}/account_info?userId=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const accountInfo = await response.json();
        return !!accountInfo.id;
      }
      
      return false;
    } catch (error: any) {
      // Only log non-authentication errors
      if (!error?.message?.includes('User needs to be authenticated')) {
        console.error('Error checking Stripe connection status:', error);
      }
      return false;
    }
  }

  /**
   * Gets Stripe account information
   */
  async getAccountInfo() {
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser.userId;

      const amplifyConfig = await import('../../../amplify_outputs.json');
      const stripeEndpoint = (amplifyConfig.default.custom as any)?.stripeConnectApiEndpoint;
      
      if (!stripeEndpoint) {
        throw new Error('Stripe Connect endpoint not configured');
      }

      const response = await fetch(`${stripeEndpoint}/account_info?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get account info');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }
}

export const stripeConnectService = StripeConnectService.getInstance();