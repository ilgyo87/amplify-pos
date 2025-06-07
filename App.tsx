import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LogBox } from 'react-native';

import outputs from './amplify_outputs.json';
import AppNavigator from './src/navigation/AppNavigator';

// Configure Amplify
Amplify.configure(outputs);

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
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