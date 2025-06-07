// Polyfills must be at the very top
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import crypto from 'react-native-quick-crypto';

// Create a comprehensive crypto polyfill for RxDB in React Native

// First, ensure we have a base crypto object
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

// Ensure getRandomValues is available (should be provided by react-native-get-random-values)
if (!(global.crypto as any).getRandomValues) {
  (global.crypto as any).getRandomValues = (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Add a minimal but functional subtle crypto implementation
if (!(global.crypto as any).subtle) {
  (global.crypto as any).subtle = {
    // Implement digest for SHA-256 which is what RxDB primarily uses
    digest: async (algorithm: string, data: Uint8Array | ArrayBuffer) => {
      try {
        // Convert algorithm name to format expected by quick-crypto
        const hashType = algorithm.toLowerCase().replace('-', '').replace('sha', 'sha');
        
        // Convert data to Uint8Array format that crypto can work with
        let dataArray: Uint8Array;
        if (data instanceof ArrayBuffer) {
          dataArray = new Uint8Array(data);
        } else if (data instanceof Uint8Array) {
          dataArray = data;
        } else {
          throw new Error('Unsupported data type for digest');
        }
        
        // Convert to string format for quick-crypto
        const dataString = Array.from(dataArray)
          .map(byte => String.fromCharCode(byte))
          .join('');
        
        // Use quick-crypto to create hash
        const hash = crypto.createHash(hashType).update(dataString).digest();
        
        // Create a new ArrayBuffer with the hash contents
        const result = new ArrayBuffer(hash.length);
        const resultView = new Uint8Array(result);
        
        // Copy hash data into the new ArrayBuffer
        for (let i = 0; i < hash.length; i++) {
          resultView[i] = hash[i];
        }
        
        return result;
      } catch (error) {
        console.error('Error in crypto.subtle.digest polyfill:', error);
        throw error;
      }
    }
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

// Configure Amplify
Amplify.configure(outputs);

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
  useEffect(() => {
    // Initialize database on app start
    const initDatabase = async () => {
      try {
        await getDatabaseInstance();
        console.log('RxDB initialized successfully');
      } catch (error) {
        console.error('Failed to initialize RxDB:', error);
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