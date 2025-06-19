// Simple types for Stripe Terminal integration
export namespace PaymentIntent {
  export type Type = {
    id: string;
    object: 'payment_intent';
    amount: number;
    currency: string;
    status: 'succeeded' | 'requires_payment_method' | 'processing' | 'canceled';
    charges?: {
      object: 'list';
      data: Array<{
        id: string;
        object: 'charge';
        amount: number;
        currency: string;
        status: 'succeeded' | 'pending' | 'failed';
        paymentMethod?: {
          id: string;
          object: 'payment_method';
          card?: {
            brand: string;
            last4: string;
          };
        };
      }>;
    };
  };
}

export namespace Reader {
  export type Type = {
    id: string;
    object: 'terminal.reader';
    deviceType: string;
    serialNumber: string;
    label?: string;
    location?: any;
    status: 'online' | 'offline';
    ipAddress?: string;
  };
}

export type ConnectionStatus = 'not_connected' | 'connecting' | 'connected';
export type PaymentStatus = 'not_ready' | 'ready' | 'processing' | 'waiting_for_input';

// Simple service wrapper for common operations
export const stripeTerminalService = {
  // Helper to check if terminal is initialized
  isInitialized(): boolean {
    // This would be managed by the hook in components
    return true;
  },

  // Helper method to get connection token from your backend
  async fetchConnectionToken(userId: string): Promise<string | null> {
    try {
      console.log('[STRIPE TERMINAL] Fetching connection token...');
      // This is now handled by the App.tsx tokenProvider
      // to avoid circular dependencies
      return null;
    } catch (error) {
      console.error('[STRIPE TERMINAL] Failed to fetch connection token:', error);
      return null;
    }
  },

  async getStripeConnectUrl(userId: string): Promise<string | null> {
    try {
      // Import stripeService to use the existing auth URL method
      const { stripeService } = await import('./index');
      const authData = await stripeService.getStripeConnectAuthUrl(userId);
      return authData?.url || null;
    } catch (error) {
      console.error('[STRIPE TERMINAL] Failed to get Stripe Connect URL:', error);
      return null;
    }
  }
};