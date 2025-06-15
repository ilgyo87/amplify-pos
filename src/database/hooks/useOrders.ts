import { useState, useEffect } from 'react';
import { OrderDocument, OrderDocType } from '../schemas/order';
import { OrderService } from '../services/orderService';
import { PaymentInfo } from '../../types/order';

let orderService: OrderService | null = null;

const getOrderService = () => {
  if (!orderService) {
    orderService = new OrderService();
  }
  return orderService;
};

export const useOrders = (status?: OrderDocType['status']) => {
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: (() => void) | null = null;

    const loadOrders = async () => {
      try {
        const service = getOrderService();
        await service.initialize();
        
        // Load initial data first
        let initialOrders: OrderDocument[];
        if (status) {
          initialOrders = await service.getOrdersByStatus(status);
        } else {
          initialOrders = await service.getAllOrders();
        }
        
        setOrders(initialOrders);
        setLoading(false);
        
        // Then set up subscription for real-time updates
        if (status) {
          subscription = await service.subscribeToOrdersByStatus(status, (updatedOrders) => {
            setOrders(updatedOrders);
          });
        } else {
          subscription = await service.subscribeToOrders((updatedOrders) => {
            setOrders(updatedOrders);
          });
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setLoading(false);
      }
    };

    loadOrders();

    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [status]);

  const createOrder = async (orderData: {
    customer: any;
    items: any[];
    paymentInfo: PaymentInfo;
    selectedDate?: string;
    notes?: string;
    barcodeData?: string;
    employee?: { id: string; name: string };
  }) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.createOrder(orderData);
    } catch (err) {
      console.error('Error creating order:', err);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderDocType['status']) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  };

  const updateOrderStatusAndRack = async (orderId: string, newStatus: OrderDocType['status'], rackNumber?: string) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.updateOrderStatusAndRack(orderId, newStatus, rackNumber);
    } catch (err) {
      console.error('Error updating order status and rack:', err);
      throw err;
    }
  };

  const updateOrder = async (orderId: string, updateData: Partial<OrderDocType>) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.updateOrder(orderId, updateData);
    } catch (err) {
      console.error('Error updating order:', err);
      throw err;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.deleteOrder(orderId);
    } catch (err) {
      console.error('Error deleting order:', err);
      throw err;
    }
  };

  const generateOrderNumber = async (customerFirstName?: string, customerLastName?: string, customerPhone?: string) => {
    try {
      const service = getOrderService();
      await service.initialize();
      return await service.generateOrderNumber(customerFirstName, customerLastName, customerPhone);
    } catch (err) {
      console.error('Error generating order number:', err);
      throw err;
    }
  };

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    updateOrderStatusAndRack,
    updateOrder,
    deleteOrder,
    generateOrderNumber
  };
};