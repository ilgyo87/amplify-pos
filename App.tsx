// Polyfills must be at the very top
import 'react-native-get-random-values'; // Provides crypto.getRandomValues() implementation
import 'react-native-url-polyfill/auto';

// Import react-native-quick-crypto for crypto.subtle support
import { install } from 'react-native-quick-crypto';
install();

// Additional crypto polyfill for RxDB compatibility
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

// Ensure getRandomValues is available
if (!(global.crypto as any).getRandomValues) {
  console.warn('crypto.getRandomValues not found, using simple fallback');
  (global.crypto as any).getRandomValues = (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LogBox } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';

import outputs from './amplify_outputs.json';
import AppNavigator from './src/navigation/AppNavigator';
import { getDatabaseInstance } from './src/database';
import { customerService } from './src/database/services/customerService';
import { syncService } from './src/database/services';
import { EmployeeAuthProvider } from './src/context/EmployeeAuthContext';
import { stripeService } from './src/services/stripeService';
import { StripeConnectHandler } from './src/components/stripe/StripeConnectHandler';
import { StripeTerminalInitializer } from './src/components/stripe/StripeTerminalInitializer';

// Configure Amplify
Amplify.configure(outputs);

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
  const [stripePublishableKey, setStripePublishableKey] = React.useState<string>('');

  useEffect(() => {
    // Initialize database and services on app start
    const initServices = async () => {
      try {
        // Initialize the database
        const db = await getDatabaseInstance();
        console.log('RxDB initialized successfully');
        
        // Initialize the customer service
        await customerService.initialize();
        console.log('CustomerService initialized successfully');
        
        // Initialize sync service
        syncService.setDatabase(db);
        console.log('SyncService initialized successfully');

        // Initialize Stripe
        const stripeSettings = await stripeService.getStripeSettings();
        const isConnected = await stripeService.getStripeConnectionStatus();
        
        if (stripeSettings?.publishableKey) {
          setStripePublishableKey(stripeSettings.publishableKey);
          await stripeService.initialize();
          console.log('Stripe initialized successfully with publishable key');
        } else if (isConnected) {
          // For Stripe Connect, we don't use the SDK for card tokenization
          // Payments will be processed through our backend
          console.log('Stripe Connect is active - card processing through backend');
        } else {
          console.log('Stripe not configured - skipping initialization');
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initServices();

    // Subscribe to Stripe settings changes
    const unsubscribe = stripeService.onSettingsChange((settings) => {
      if (settings?.publishableKey) {
        setStripePublishableKey(settings.publishableKey);
      } else {
        setStripePublishableKey('');
      }
    });

    return unsubscribe;
  }, []);

  // Token provider for Stripe Terminal
  const fetchConnectionToken = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const currentUser = await getCurrentUser();
      const userId = currentUser.userId;
      
      const token = await stripeService.createConnectionToken(userId);
      if (!token) {
        // Return a dummy token to prevent infinite retries
        console.warn('[STRIPE] No connection token available, using placeholder');
        return 'pst_test_placeholder';
      }
      return token;
    } catch (error) {
      console.error('Error in fetchConnectionToken:', error);
      // Return a dummy token to prevent infinite retries
      return 'pst_test_placeholder';
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <StripeProvider
        publishableKey={stripePublishableKey || 'pk_test_placeholder'}
        merchantIdentifier="merchant.identifier"
      >
        <NavigationContainer>
          <Authenticator.Provider>
            <StripeTerminalProvider
              logLevel="verbose"
              tokenProvider={fetchConnectionToken}
            >
              <StripeTerminalInitializer>
                <EmployeeAuthProvider>
                  <StripeConnectHandler />
                  <AppNavigator />
                </EmployeeAuthProvider>
              </StripeTerminalInitializer>
            </StripeTerminalProvider>
          </Authenticator.Provider>
        </NavigationContainer>
      </StripeProvider>
    </SafeAreaProvider>
  );
};

export default App;