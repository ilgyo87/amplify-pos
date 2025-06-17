import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { stripeConnectService } from '../../services/stripeConnectService';

export function StripeConnectHandler() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Received deep link:', url);
      
      if (url.includes('stripe-connect-callback')) {
        try {
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          const state = parsedUrl.searchParams.get('state');
          const error = parsedUrl.searchParams.get('error');

          if (error) {
            console.error('Stripe Connect error:', error);
            return;
          }

          if (code && state) {
            console.log('Processing Stripe Connect callback with code:', code.substring(0, 10) + '...');
            
            // Process the callback using the new service
            const success = await stripeConnectService.handleCallback(code, state);
            
            if (success) {
              console.log('✅ Stripe Connect setup completed successfully!');
              // You can emit an event or call a callback here to update the UI
            } else {
              console.error('❌ Failed to process Stripe Connect callback');
            }
          } else {
            console.error('Missing code or state parameters in callback URL');
          }
        } catch (error) {
          console.error('Error handling Stripe Connect deep link:', error);
        }
      }
    };

    // Check if the app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while the app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return null;
}