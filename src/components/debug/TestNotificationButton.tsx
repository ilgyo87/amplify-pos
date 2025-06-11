import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { notificationService } from '../../services/notificationService';

export function TestNotificationButton() {
  const testNotifications = async () => {
    try {
      // Create a test customer with notifications enabled
      const testCustomer = {
        id: 'test-customer',
        firstName: 'Test',
        lastName: 'Customer',
        email: 'ilgyo87@gmail.com', // Change this to your email
        phone: '+1234567890', // Change this to your phone
        emailNotifications: true,
        textNotifications: true,
        isLocalOnly: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;

      // Create a test order
      const testOrder = {
        id: 'test-order',
        orderNumber: 'TEST-001',
        customerId: 'test-customer',
        customerName: 'Test Customer',
        items: [
          {
            id: 'test-item',
            name: 'Test Shirt',
            description: 'Dry cleaning',
            price: 15.99,
            quantity: 1,
            itemKey: 'test-key'
          }
        ],
        subtotal: 15.99,
        tax: 1.40,
        total: 17.39,
        paymentMethod: 'cash' as const,
        status: 'completed' as const,
        isLocalOnly: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;

      console.log('🧪 Testing notifications...');
      await notificationService.sendOrderCompletedNotification(testCustomer, testOrder);
      
      Alert.alert('Success', 'Test notifications sent! Check console for details.');
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', `Failed to send test notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={testNotifications}>
      <Text style={styles.buttonText}>🧪 Test Notifications</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});