// Polyfills must be at the very top
import 'react-native-get-random-values'; // Provides crypto.getRandomValues() implementation
import 'react-native-url-polyfill/auto';

// Make sure crypto object exists on global
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

// RxDB primarily relies on getRandomValues which is provided by react-native-get-random-values
// This simple fallback is only used if react-native-get-random-values failed to install properly
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

import outputs from './amplify_outputs.json';
import AppNavigator from './src/navigation/AppNavigator';
import { getDatabaseInstance } from './src/database';
import { customerService } from './src/database/services/customerService';

// Configure Amplify
Amplify.configure(outputs);

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
  useEffect(() => {
    // Initialize database and services on app start
    const initDatabase = async () => {
      try {
        // Initialize the database
        await getDatabaseInstance();
        console.log('RxDB initialized successfully');
        
        // Initialize the customer service
        await customerService.initialize();
        console.log('CustomerService initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database services:', error);
      }
    };

    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Authenticator.Provider>
          <AppNavigator />
        </Authenticator.Provider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;