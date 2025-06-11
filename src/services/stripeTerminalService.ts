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
  async fetchConnectionToken(): Promise<string | null> {
    try {
      // This should call your backend to get a connection token
      // For now, return a placeholder
      console.log('[STRIPE TERMINAL] Fetching connection token from backend...');
      
      // In a real implementation, you would call your backend:
      // const response = await fetch('your-backend-url/connection_token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      // });
      // const { secret } = await response.json();
      // return secret;

      // For development/testing, you would get this from your Stripe dashboard
      throw new Error('Connection token endpoint not configured. Please implement fetchConnectionToken in your backend.');
    } catch (error) {
      console.error('[STRIPE TERMINAL] Failed to fetch connection token:', error);
      return null;
    }
  }
};