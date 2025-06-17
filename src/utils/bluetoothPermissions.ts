import { Platform, Linking, Alert } from 'react-native';

export const checkBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // On iOS, we can't check permissions programmatically without react-native-permissions
    // The system will prompt automatically when we try to use Bluetooth
    // Just show an informational message
    return new Promise((resolve) => {
      Alert.alert(
        'Bluetooth Required',
        'The app will request Bluetooth access to connect to your card reader. Please allow access when prompted.',
        [
          {
            text: 'Cancel',
            onPress: () => resolve(false),
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }
  
  // Android permissions are handled by the Stripe Terminal SDK
  return true;
};

export const handleBluetoothError = (error: any) => {
  if (error.message?.includes('bluetooth') || error.message?.includes('Bluetooth')) {
    Alert.alert(
      'Bluetooth Access Required',
      'Please ensure Bluetooth is enabled and the app has permission to use it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }
};