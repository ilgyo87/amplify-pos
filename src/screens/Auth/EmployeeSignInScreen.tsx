import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PinInput } from '../../components/auth/PinInput';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { RootStackParamList } from '../../navigation/types';

export default function EmployeeSignInScreen() {
  const { signIn, isLoading } = useEmployeeAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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