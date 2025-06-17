import React, { useEffect, useState } from 'react';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { Platform, Alert } from 'react-native';
import { requestNeededAndroidPermissions } from '@stripe/stripe-terminal-react-native';

export function StripeTerminalInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useStripeTerminal();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTerminal = async () => {
      // Skip if already initialized or currently initializing
      if (isInitialized || isInitializing) {
        return;
      }

      setIsInitializing(true);
      setInitError(null);

      try {
        console.log('[STRIPE TERMINAL INITIALIZER] Starting Terminal initialization...');

        // Request permissions on Android
        if (Platform.OS === 'android') {
          const { granted } = await requestNeededAndroidPermissions();
          if (!granted) {
            throw new Error('Required permissions not granted for Stripe Terminal');
          }
          console.log('[STRIPE TERMINAL INITIALIZER] Android permissions granted');
        }

        // Initialize the terminal
        const { error } = await initialize();
        
        if (error) {
          console.error('[STRIPE TERMINAL INITIALIZER] Initialization error:', error);
          setInitError(error.message || 'Failed to initialize Stripe Terminal');
          
          // Show user-friendly error for common issues
          if (error.message?.includes('Bluetooth')) {
            Alert.alert(
              'Bluetooth Required',
              'Please enable Bluetooth in your device settings to use card readers.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('[STRIPE TERMINAL INITIALIZER] Terminal initialized successfully');
        }
      } catch (error: any) {
        console.error('[STRIPE TERMINAL INITIALIZER] Failed to initialize:', error);
        setInitError(error.message || 'Failed to initialize Stripe Terminal');
        
        // Don't crash the app on initialization failure
        // Terminal features will be disabled but app continues to work
        console.log('[STRIPE TERMINAL INITIALIZER] App will continue without Terminal support');
        
        // If initialization fails due to Bluetooth, suggest using simulated readers
        if (error.message?.includes('Bluetooth') || error.message?.includes('bluetooth')) {
          console.log('[STRIPE TERMINAL INITIALIZER] Bluetooth issue detected. Use simulated readers for testing.');
        }
      } finally {
        setIsInitializing(false);
      }
    };

    // Initialize on mount
    initializeTerminal();
  }, []); // Empty dependency array - only run once on mount

  // Log the current state
  useEffect(() => {
    console.log('[STRIPE TERMINAL INITIALIZER] State:', {
      isInitialized,
      isInitializing,
      hasError: !!initError
    });
  }, [isInitialized, isInitializing, initError]);

  return <>{children}</>;
}