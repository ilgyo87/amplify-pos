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
import { Ionicons } from '@expo/vector-icons';

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
import EmployeeSignInScreen from '../screens/Auth/EmployeeSignInScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <TouchableOpacity onPress={handleSignOut}>
      <Text style={{ color: '#007AFF', fontSize: 16 }}>Sign Out</Text>
    </TouchableOpacity>
  );
};

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
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  if (!currentEmployee) {
    return showBackButton ? (
      <TouchableOpacity onPress={handleBackPress}>
        <Text style={{ color: '#007AFF', fontSize: 16 }}>Back</Text>
      </TouchableOpacity>
    ) : null;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {showBackButton && (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentEmployee.id === 'temp-admin' ? '#FFF3CD' : '#E3F2FD',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: currentEmployee.id === 'temp-admin' ? '#856404' : '#007AFF',
        }}
        onPress={handleEmployeePress}
      >
        <View style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: currentEmployee.id === 'temp-admin' ? '#856404' : '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: '600',
          }}>
            {currentEmployee.firstName.charAt(0)}{currentEmployee.lastName.charAt(0)}
          </Text>
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#333',
            }}>
              {currentEmployee.firstName} {currentEmployee.lastName}
            </Text>
            {currentEmployee.id === 'temp-admin' && (
              <View style={{
                backgroundColor: '#856404',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
                marginLeft: 6,
              }}>
                <Text style={{
                  fontSize: 8,
                  color: 'white',
                  fontWeight: '600',
                }}>
                  TEMP
                </Text>
              </View>
            )}
          </View>
          <Text style={{
            fontSize: 10,
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
      headerBackTitle: '',
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
            name="EmployeeSignIn"
            options={{ 
              title: 'Employee Sign In',
              headerLeft: () => <EmployeeHeaderLeft showBackButton={true} />,
              headerRight: () => <SignOutButton />,
              presentation: 'modal'
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <EmployeeSignInScreen />
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
