import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { PinInput } from '../../components/auth/PinInput';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

export default function EmployeeSignInScreen() {
  const { signIn, isLoading } = useEmployeeAuth();

  const handlePinSubmit = async (pin: string) => {
    return await signIn(pin);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PinInput
          onSubmit={handlePinSubmit}
          isLoading={isLoading}
          title="Employee Sign In"
          subtitle="Enter your 4-digit PIN to continue"
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
  },
});