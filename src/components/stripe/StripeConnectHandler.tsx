import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { stripeService } from '../../services/stripeService';
import { getCurrentUser } from 'aws-amplify/auth';

export function StripeConnectHandler() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
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
            // Get current user to verify the state
            const currentUser = await getCurrentUser();
            const userId = currentUser.userId;

            // Process the callback
            const success = await stripeService.handleStripeConnectCallback(code, userId);
            
            if (success) {
              console.log('Stripe Connect callback processed successfully');
              // You might want to emit an event here to update the UI
            } else {
              console.error('Failed to process Stripe Connect callback');
            }
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