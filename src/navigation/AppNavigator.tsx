import React, { useEffect } from 'react';
import { Button, TouchableOpacity, View, Text, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import type { RootStackParamList } from './types';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { AuthenticationWrapper } from '../components/auth/AuthenticationWrapper';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

// Screens
import Dashboard from '../screens/Dashboard';
import CustomersScreen from '../screens/Customers/CustomersScreen';
import ProductsScreen from '../screens/Products/ProductsScreen';
import OrdersScreen from '../screens/Orders/OrdersScreen';
import EmployeesScreen from '../screens/Employees/EmployeesScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import BusinessSettingsScreen from '../screens/Settings/BusinessSettingsScreen';
import PaymentSettingsScreen from '../screens/Settings/PaymentSettingsScreen';
import PrinterSettingsScreen from '../screens/Settings/PrinterSettingsScreen';
import DataSyncScreen from '../screens/Settings/DataSyncScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';
import CheckoutScreen from '../screens/Checkout/CheckoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// SignOutButton component (AWS Amplify)
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

// Employee header component that can include back button
const EmployeeHeaderLeft = ({ showBackButton = false }: { showBackButton?: boolean }) => {
  const { currentEmployee, signOut } = useEmployeeAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleEmployeePress = () => {
    if (currentEmployee) {
      Alert.alert(
        'Sign Out Employee',
        `Are you sure you want to sign out ${currentEmployee.firstName} ${currentEmployee.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: signOut }
        ]
      );
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  if (!currentEmployee) {
    return showBackButton ? (
      <TouchableOpacity 
        style={{ marginLeft: 8, padding: 4 }}
        onPress={handleBackPress}
      >
        <Text style={{ fontSize: 16, color: '#007AFF' }}>← Back</Text>
      </TouchableOpacity>
    ) : null;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
      {showBackButton && (
        <TouchableOpacity 
          style={{ marginRight: 12, padding: 4 }}
          onPress={handleBackPress}
        >
          <Text style={{ fontSize: 16, color: '#007AFF' }}>← Back</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentEmployee.id === 'temp-admin' ? '#FFF3E0' : '#f0f8ff',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: currentEmployee.id === 'temp-admin' ? '#FF9800' : '#e0e0e0',
        }}
        onPress={handleEmployeePress}
        activeOpacity={0.7}
      >
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: currentEmployee.id === 'temp-admin' ? '#FF9800' : '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 6,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 10,
            fontWeight: '600',
          }}>
            {currentEmployee.firstName.charAt(0)}{currentEmployee.lastName.charAt(0)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: '#333',
          }}>
            {currentEmployee.firstName} {currentEmployee.lastName}
            {currentEmployee.id === 'temp-admin' && (
              <Text style={{ fontSize: 9, color: '#FF6F00', fontWeight: '700' }}> (SETUP)</Text>
            )}
          </Text>
          <Text style={{
            fontSize: 9,
            color: '#666',
          }}>
            {currentEmployee.role || 'Employee'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
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
              headerLeft: () => <EmployeeHeaderLeft showBackButton={false} />,
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
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <CustomersScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Products"
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <ProductsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Orders"
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <OrdersScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Employees"
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <EmployeesScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Settings"
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <SettingsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="BusinessSettings"
            options={{ 
              title: 'Business Profile',
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <BusinessSettingsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="PaymentSettings"
            options={{ 
              title: 'Payment Settings',
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <PaymentSettingsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="PrinterSettings"
            options={{ 
              title: 'Printer Settings',
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <PrinterSettingsScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="DataSync"
            options={{ 
              title: 'Data Sync',
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <DataSyncScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Reports"
            options={{ 
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton /> 
            }}
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
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton />,
              presentation: 'fullScreenModal',
              headerTitle: 'Checkout'
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
