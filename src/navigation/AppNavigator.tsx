import React, { useEffect } from 'react';
import { Button } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import type { RootStackParamList } from './types';
import { Authenticator } from '@aws-amplify/ui-react-native';

// Screens
import Dashboard from '../screens/Dashboard';
import CustomersScreen from '../screens/Customers/CustomersScreen';
import ProductsScreen from '../screens/Products/ProductsScreen';
import OrdersScreen from '../screens/Orders/OrdersScreen';
import EmployeesScreen from '../screens/Employees/EmployeesScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';

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
        <>
          <Stack.Screen 
            name="Dashboard" 
            component={Dashboard} 
            options={{ 
              title: 'Amplify POS',
              headerRight: () => <SignOutButton />
            }} 
          />
          <Stack.Screen 
            name="Customers" 
            component={CustomersScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
          <Stack.Screen 
            name="Products" 
            component={ProductsScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
          <Stack.Screen 
            name="Orders" 
            component={OrdersScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
          <Stack.Screen 
            name="Employees" 
            component={EmployeesScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen}
            options={{ headerRight: () => <SignOutButton /> }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
