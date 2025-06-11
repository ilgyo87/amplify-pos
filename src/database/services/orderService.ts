import { OrderRepository } from '../repositories/OrderRepository';
import { OrderDocument, OrderDocType } from '../schemas/order';
import { OrderItem } from '../../types/order';
import { SerializableCustomer } from '../../navigation/types';
import { getDatabaseInstance } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { toPreciseAmount } from '../../utils/monetaryUtils';
import { notificationService } from '../../services/notificationService';
import { customerService } from './customerService';

export class OrderService {
  private repository: OrderRepository | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const db = await getDatabaseInstance();
    this.repository = new OrderRepository(db.orders);
    this.initialized = true;
  }

  private async getRepository(): Promise<OrderRepository> {
    if (!this.repository) {
      await this.initialize();
    }
    return this.repository!;
  }

  async createOrder({
    customer,
    items,
    paymentMethod,
    selectedDate,
    notes,
    barcodeData,
    employee
  }: {
    customer: SerializableCustomer;
    items: OrderItem[];
    paymentMethod: 'cash' | 'card' | 'credit';
    selectedDate?: string;
    notes?: string;
    barcodeData?: string;
    employee?: { id: string; name: string };
  }): Promise<OrderDocument> {
    const repository = await this.getRepository();
    const now = new Date().toISOString();
    const orderNumber = await repository.generateOrderNumber();
    
    // Get a valid businessId
    let businessId = customer.businessId || '';
    if (!businessId || businessId.trim() === '') {
      try {
        const { businessService } = await import('./businessService');
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        if (businesses.length > 0) {
          businessId = businesses[0].id;
          console.log(`[ORDER CREATE] Using business ID ${businessId} for new order`);
        } else {
          console.warn('[ORDER CREATE] No businesses found, using empty businessId');
          businessId = '';
        }
      } catch (error) {
        console.error('Error getting business for new order:', error);
        businessId = '';
      }
    }
    
    // Using a more robust approach for monetary values to eliminate floating point errors
    
    // Calculate totals with precise handling of decimals
    const rawSubtotal = items.reduce((sum, item) => {
      const basePrice = Number(item.price) || 0;
      const additionalPrice = Number(item.additionalPrice) || 0;
      const itemPrice = basePrice + additionalPrice;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      
      const discountedPrice = discount > 0 
        ? itemPrice * (1 - discount / 100)
        : itemPrice;
      return sum + (discountedPrice * quantity);
    }, 0);

    // Convert all monetary values using the cents-based approach
    const subtotal = toPreciseAmount(rawSubtotal);
    const tax = toPreciseAmount(subtotal * 0.0875); // 8.75% tax
    const total = toPreciseAmount(subtotal + tax);

    // Initialize status history with order creation
    const timestamp = new Date(now).toLocaleString();
    const initialStatusHistory = [`${timestamp}: Order created with status 'pending'`];

    const orderData: OrderDocType = {
      id: uuidv4(),
      orderNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      businessId: businessId, // Use the resolved businessId
      employeeId: employee?.id,
      employeeName: employee?.name,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        categoryId: item.categoryId, // Preserve categoryId for sync purposes
        discount: Number(item.discount) || 0, // Preserve discount for sync purposes
        options: item.options,
        itemKey: item.itemKey
      })),
      // Store the exact values calculated with our cents-based approach
      // This ensures they're precisely what the schema expects (multiples of 0.01)
      subtotal: subtotal,
      tax: tax,
      total: total,
      paymentMethod,
      selectedDate,
      status: 'pending',
      statusHistory: initialStatusHistory,
      notes,
      barcodeData,
      isLocalOnly: true,
      createdAt: now,
      updatedAt: now
    };

    return repository.create(orderData);
  }

  async getOrderById(id: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    return repository.findById(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    return repository.findByOrderNumber(orderNumber);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderDocument[]> {
    const repository = await this.getRepository();
    return repository.findByCustomerId(customerId);
  }

  async getOrdersByStatus(status: OrderDocType['status']): Promise<OrderDocument[]> {
    const repository = await this.getRepository();
    return repository.findByStatus(status);
  }

  async getRecentOrders(limit?: number): Promise<OrderDocument[]> {
    const repository = await this.getRepository();
    return repository.findRecent(limit);
  }

  async updateOrderStatus(orderId: string, status: OrderDocType['status']): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    
    // Get the current order to access its current status and history
    const currentOrder = await repository.findById(orderId);
    if (!currentOrder) {
      return null;
    }

    // Create status history entry
    const now = new Date();
    const timestamp = now.toLocaleString();
    const statusEntry = `${timestamp}: Status changed from '${currentOrder.status}' to '${status}'`;
    
    // Get existing status history or create new array
    const currentHistory = currentOrder.statusHistory || [];
    const updatedHistory = [...currentHistory, statusEntry];

    // Use the repository's update method to update both status and history
    const updatedOrder = await repository.update(orderId, {
      status,
      statusHistory: updatedHistory,
      updatedAt: now.toISOString()
    });

    // Send notifications if order is marked as completed
    if (status === 'completed' && updatedOrder) {
      try {
        await customerService.initialize();
        const customer = await customerService.getCustomerById(updatedOrder.customerId);
        if (customer) {
          await notificationService.sendOrderCompletedNotification(customer, updatedOrder);
        }
      } catch (error) {
        console.error('Failed to send notification for completed order:', error);
        // Don't throw - we don't want notification failures to break order completion
      }
    }

    return updatedOrder;
  }

  async updateOrderRack(orderId: string, rackNumber: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    return repository.update(orderId, { rackNumber, updatedAt: new Date().toISOString() });
  }

  async updateOrderStatusAndRack(orderId: string, status: OrderDocType['status'], rackNumber?: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    
    // Get the current order to access its current status and history
    const currentOrder = await repository.findById(orderId);
    if (!currentOrder) {
      return null;
    }

    // Create status history entry
    const now = new Date();
    const timestamp = now.toLocaleString();
    const statusEntry = `${timestamp}: Status changed from '${currentOrder.status}' to '${status}'${rackNumber ? ` (Rack: ${rackNumber})` : ''}`;
    
    // Get existing status history or create new array
    const currentHistory = currentOrder.statusHistory || [];
    const updatedHistory = [...currentHistory, statusEntry];

    const updateData: Partial<OrderDocType> = { 
      status,
      statusHistory: updatedHistory, 
      updatedAt: now.toISOString() 
    };
    if (rackNumber) {
      updateData.rackNumber = rackNumber;
    }
    
    const updatedOrder = await repository.update(orderId, updateData);

    // Send notifications if order is marked as completed
    if (status === 'completed' && updatedOrder) {
      try {
        await customerService.initialize();
        const customer = await customerService.getCustomerById(updatedOrder.customerId);
        if (customer) {
          await notificationService.sendOrderCompletedNotification(customer, updatedOrder);
        }
      } catch (error) {
        console.error('Failed to send notification for completed order:', error);
        // Don't throw - we don't want notification failures to break order completion
      }
    }

    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const repository = await this.getRepository();
    return repository.delete(id);
  }

  async getAllOrders(): Promise<OrderDocument[]> {
    const repository = await this.getRepository();
    return repository.findAll();
  }

  async subscribeToOrders(callback: (orders: OrderDocument[]) => void): Promise<() => void> {
    const repository = await this.getRepository();
    return repository.subscribeToChanges(async () => {
      const orders = await repository.findAll();
      callback(orders);
    });
  }

  async subscribeToOrdersByStatus(status: OrderDocType['status'], callback: (orders: OrderDocument[]) => void): Promise<() => void> {
    const repository = await this.getRepository();
    return repository.subscribe(
      {
        selector: {
          status,
          isDeleted: { $ne: true }
        },
        sort: [{ createdAt: 'desc' }]
      },
      callback
    );
  }

  async generateOrderNumber(): Promise<string> {
    const repository = await this.getRepository();
    return repository.generateOrderNumber();
  }

  /**
   * Mark an order as synced with the remote server
   * @param localId The local order ID
   * @param amplifyId The ID from Amplify
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.update(localId, { 
      isLocalOnly: false, 
      amplifyId,
      updatedAt: new Date().toISOString() 
    });
  }

  /**
   * Update an order with new data
   * @param id The order ID to update
   * @param updateData The data to update
   */
  async updateOrder(id: string, updateData: Partial<OrderDocType>): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    return repository.update(id, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
  }
}