import React, { useEffect } from 'react';
import { Button } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import type { RootStackParamList } from './types';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { AuthenticationWrapper } from '../components/auth/AuthenticationWrapper';

// Screens
import Dashboard from '../screens/Dashboard';
import CustomersScreen from '../screens/Customers/CustomersScreen';
import ProductsScreen from '../screens/Products/ProductsScreen';
import OrdersScreen from '../screens/Orders/OrdersScreen';
import EmployeesScreen from '../screens/Employees/EmployeesScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';
import CheckoutScreen from '../screens/Checkout/CheckoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// SignOutButton component
const SignOutButton = () => {
  const { signOut } = useAuthenticator();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate('Auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Button 
      title="Sign Out" 
      onPress={handleSignOut}
      color="#FF3B30"
    />
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user } = useAuthenticator(context => [context.user]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Redirect to Home if user is authenticated and on Auth screen
  useEffect(() => {
    if (user) {
      navigation.navigate('Dashboard');
    }
  }, [user, navigation]);

  return (
    <Stack.Navigator screenOptions={{
      headerStyle: {
        backgroundColor: '#f5f5f5',
      },
      headerTintColor: '#000',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      {!user ? (
        <Stack.Screen 
          name="Auth" 
          component={Authenticator} 
          options={{ 
            headerShown: false,
            animationTypeForReplace: user ? 'pop' : 'push',
          }}
        />
      ) : (
        <Stack.Group>
          <Stack.Screen 
            name="Dashboard" 
            options={{ 
              title: 'Amplify POS',
              headerRight: () => <SignOutButton />
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <Dashboard />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Customers"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <CustomersScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Products"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <ProductsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Orders"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <OrdersScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Employees"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <EmployeesScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Settings"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <SettingsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Reports"
            options={{ headerRight: () => <SignOutButton /> }}
          >
            {() => (
              <AuthenticationWrapper>
                <ReportsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Checkout"
            options={{ 
              headerShown: false, // CheckoutScreen handles its own header
              presentation: 'fullScreenModal'
            }}
          >
            {(props) => (
              <AuthenticationWrapper>
                <CheckoutScreen {...props} />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
