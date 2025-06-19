import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { OrderDocument } from '../database/schemas/order';
import { orderService } from '../database/services';
import { stripeService } from '../services/stripeService';
import { OrderStatus } from '../types/order';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrderRefundOptions {
  refundAmount?: number;
  reason?: string;
}

export function useOrderManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const updateOrderStatus = useCallback(async (
    order: OrderDocument,
    newStatus: OrderStatus,
    onSuccess?: () => void
  ) => {
    try {
      setIsProcessing(true);
      const customerId = await AsyncStorage.getItem('@current_customer_id');
      const customerName = await AsyncStorage.getItem('@current_customer_name');
      const customerPhone = await AsyncStorage.getItem('@current_customer_phone');
      
      const updatedOrder = await orderService.updateOrderStatus(
        order.id,
        newStatus
      );
      
      if (onSuccess) {
        onSuccess();
      }
      
      return updatedOrder;
    } catch (error) {
      console.error('Failed to update order status:', error);
      Alert.alert('Error', 'Failed to update order status');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelOrder = useCallback(async (
    order: OrderDocument,
    options?: OrderRefundOptions
  ): Promise<boolean> => {
    try {
      setIsProcessing(true);
      
      // Validate refund amount if provided
      if (options?.refundAmount !== undefined) {
        if (options.refundAmount <= 0) {
          Alert.alert('Invalid Amount', 'Refund amount must be greater than zero');
          return false;
        }
        if (options.refundAmount > order.total) {
          Alert.alert('Invalid Amount', 'Refund amount cannot exceed order total');
          return false;
        }
      }

      // Process refund if order has Stripe payment
      if (order.paymentInfo?.stripeChargeId && options?.refundAmount) {
        const isStripeInitialized = stripeService.isInitialized();
        if (!isStripeInitialized) {
          Alert.alert(
            'Stripe Not Configured',
            'Stripe is not configured. The order will be cancelled without processing the refund.'
          );
        } else {
          try {
            await stripeService.refundPayment(
              order.paymentInfo.stripeChargeId,
              Math.round(options.refundAmount * 100), // Convert to cents
              options.reason || 'Order cancelled'
            );
          } catch (refundError: any) {
            console.error('Refund failed:', refundError);
            Alert.alert(
              'Refund Failed',
              refundError.message || 'Failed to process refund. The order will still be cancelled.'
            );
          }
        }
      }

      // Update order status to cancelled
      const customerId = await AsyncStorage.getItem('@current_customer_id');
      const customerName = await AsyncStorage.getItem('@current_customer_name');
      const customerPhone = await AsyncStorage.getItem('@current_customer_phone');
      
      await orderService.updateOrderStatus(
        order.id,
        'cancelled'
      );
      
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      Alert.alert('Error', 'Failed to cancel order');
      return false;
    } finally {
      setIsProcessing(false);
      setRefundAmount('');
      setRefundReason('');
    }
  }, []);

  const markAsReadyForPickup = useCallback(async (order: OrderDocument) => {
    return updateOrderStatus(order, 'ready', () => {
      Alert.alert('Success', 'Order marked as ready for pickup');
    });
  }, [updateOrderStatus]);

  const markAsCompleted = useCallback(async (order: OrderDocument) => {
    return updateOrderStatus(order, 'completed', () => {
      Alert.alert('Success', 'Order marked as completed');
    });
  }, [updateOrderStatus]);

  const markAsInProgress = useCallback(async (order: OrderDocument) => {
    return updateOrderStatus(order, 'in_progress');
  }, [updateOrderStatus]);

  const markAsPickedUp = useCallback(async (order: OrderDocument) => {
    return updateOrderStatus(order, 'picked_up', () => {
      Alert.alert('Success', 'Order marked as picked up');
    });
  }, [updateOrderStatus]);

  return {
    isProcessing,
    refundAmount,
    setRefundAmount,
    refundReason,
    setRefundReason,
    updateOrderStatus,
    cancelOrder,
    markAsReadyForPickup,
    markAsCompleted,
    markAsInProgress,
    markAsPickedUp,
  };
}