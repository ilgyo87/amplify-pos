import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PinInput } from '../../components/auth/PinInput';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { RootStackParamList } from '../../navigation/types';
import { employeeService } from '../../database/services/employeeService';

export default function EmployeeSignInScreen() {
  const { signIn, isLoading } = useEmployeeAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hasNoEmployees, setHasNoEmployees] = useState(false);

  useEffect(() => {
    // Check if there are any employees when the screen loads
    const checkEmployees = async () => {
      try {
        await employeeService.initialize();
        const employees = await employeeService.getAllEmployees();
        setHasNoEmployees(employees.length === 0);
      } catch (error) {
        console.error('Error checking employees:', error);
      }
    };

    checkEmployees();
  }, []);

  const handlePinSubmit = async (pin: string) => {
    const result = await signIn(pin);
    
    // If sign-in was successful, navigate appropriately
    if (result.success) {
      // Check if we can go back, otherwise navigate to Dashboard
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Dashboard');
      }
    }
    
    return result;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PinInput
          onSubmit={handlePinSubmit}
          isLoading={isLoading}
          title="Employee Sign In"
          subtitle="Enter your 4-digit PIN to continue"
          showSetupHint={hasNoEmployees}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 90, // Slight offset from center
  },
});