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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import RackManagementScreen from '../screens/Settings/RackManagementScreen';
import ReportsScreen from '../screens/Reports/ReportsScreen';
import CheckoutScreen from '../screens/Checkout/CheckoutScreen';
import EmployeeSignInScreen from '../screens/Auth/EmployeeSignInScreen';
import { InitialSyncScreen } from '../components/sync/InitialSyncScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SignOutButton = () => {
  const { signOut } = useAuthenticator();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSignOut = async () => {
    try {
      // Clear the initial sync flag so next user gets a fresh sync
      await AsyncStorage.removeItem('@initial_sync_complete');
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

const EmployeeHeaderCenter = () => {
  const { currentEmployee, signOut } = useEmployeeAuth();

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

  if (!currentEmployee) {
    return null;
  }

  return (
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
  );
};

const BackButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity onPress={handleBackPress}>
      <Ionicons name="chevron-back" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user } = useAuthenticator(context => [context.user]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Redirect to InitialSync if user is authenticated and on Auth screen
  useEffect(() => {
    if (user) {
      navigation.navigate('InitialSync');
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
            name="InitialSync" 
            component={InitialSyncScreen}
            options={{ 
              headerShown: false
            }}
          />
          <Stack.Screen 
            name="Dashboard" 
            options={{ 
              title: '',
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
            name="RackManagement"
            options={{ 
              title: 'Rack Management',
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
              headerRight: () => <SignOutButton /> 
            }}
          >
            {() => (
              <AuthenticationWrapper>
                <RackManagementScreen />
              </AuthenticationWrapper>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Reports"
            options={{ 
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
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
              headerShown: false,
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
              headerLeft: () => <BackButton />,
              headerTitle: () => <EmployeeHeaderCenter />,
              headerRight: () => <SignOutButton />,
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
