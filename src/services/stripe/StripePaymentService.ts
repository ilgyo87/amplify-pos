import { stripeConfigService } from './StripeConfigService';
import { stripeConnectService } from './StripeConnectService';
import { getCurrentUser } from 'aws-amplify/auth';

let STRIPE_PAYMENT_ENDPOINT = '';

// Initialize endpoint on first use
const initializeEndpoint = async () => {
  if (!STRIPE_PAYMENT_ENDPOINT) {
    const amplifyConfig = await import('../../../amplify_outputs.json');
    STRIPE_PAYMENT_ENDPOINT = (amplifyConfig.default.custom as any)?.stripePaymentEndpoint || '';
  }
};

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const user = await getCurrentUser();
    return user.userId;
  } catch {
    return null;
  }
};

export class StripePaymentService {
  async processPayment(
    tokenId: string,
    amount: number,
    description?: string,
    metadata?: any
  ): Promise<{ chargeId: string }> {
    try {
      // Check if either traditional Stripe or Stripe Connect is configured
      const isTraditionalStripe = stripeConfigService.isInitialized();
      const isStripeConnect = await stripeConnectService.isConnected();
      
      if (!isTraditionalStripe && !isStripeConnect) {
        throw new Error('Stripe is not initialized. Please configure Stripe settings first.');
      }

      await initializeEndpoint();
      if (!STRIPE_PAYMENT_ENDPOINT) {
        throw new Error('Stripe payment endpoint not configured');
      }

      console.log('Processing payment:', {
        amount,
        description,
        endpoint: STRIPE_PAYMENT_ENDPOINT,
      });

      const response = await fetch(STRIPE_PAYMENT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenId, // Changed from tokenId to token to match lambda
          amount: amount, // Lambda expects amount in dollars
          currency: 'usd',
          description: description || 'POS Payment',
          metadata: metadata || {},
          userId: await getCurrentUserId(), // Add userId for Stripe Connect
        }),
      });

      const responseText = await response.text();
      console.log('Payment response:', response.status, responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        throw new Error(errorData.error || 'Payment failed');
      }

      const data = JSON.parse(responseText);
      
      if (!data.chargeId) {
        throw new Error('Payment response missing charge ID');
      }

      return { chargeId: data.chargeId };
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  async refundPayment(
    chargeId: string,
    amountInCents?: number,
    reason?: string
  ): Promise<{ refundId: string }> {
    try {
      // Check if either traditional Stripe or Stripe Connect is configured
      const isTraditionalStripe = stripeConfigService.isInitialized();
      const isStripeConnect = await stripeConnectService.isConnected();
      
      if (!isTraditionalStripe && !isStripeConnect) {
        throw new Error('Stripe is not initialized');
      }

      await initializeEndpoint();
      if (!STRIPE_PAYMENT_ENDPOINT) {
        throw new Error('Stripe payment endpoint not configured');
      }

      const refundUrl = `${STRIPE_PAYMENT_ENDPOINT}/refund`;
      console.log('Processing refund:', {
        chargeId,
        amount: amountInCents,
        reason,
        endpoint: refundUrl,
      });

      const response = await fetch(refundUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chargeId,
          amount: amountInCents,
          reason: reason || 'requested_by_customer',
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        throw new Error(errorData.error || 'Refund failed');
      }

      const data = JSON.parse(responseText);
      
      if (!data.refundId) {
        throw new Error('Refund response missing refund ID');
      }

      return { refundId: data.refundId };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }
}

export const stripePaymentService = new StripePaymentService();