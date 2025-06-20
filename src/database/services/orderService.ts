import { OrderRepository } from '../repositories/OrderRepository';
import { OrderDocument, OrderDocType } from '../schemas/order';
import { OrderItem, PaymentInfo } from '../../types/order';
import { SerializableCustomer } from '../../navigation/types';
import { getDatabaseInstance } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { toPreciseAmount } from '../../utils/monetaryUtils';
import { notificationService } from '../../services/notificationService';
import { customerService } from './customerService';

export class OrderService {
  private repository: OrderRepository | null = null;
  private initialized = false;
  private notificationSubscription: (() => void) | null = null;
  private notifiedOrders = new Set<string>(); // Track orders that already received notifications

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const db = await getDatabaseInstance();
    this.repository = new OrderRepository(db.orders);
    this.initialized = true;
    
    // Reactive notifications disabled due to duplicate issues
    // await this.setupReactiveNotifications();
  }

  private async getRepository(): Promise<OrderRepository> {
    if (!this.repository) {
      await this.initialize();
    }
    return this.repository!;
  }

  /**
   * Set up reactive notifications that trigger immediately when order status changes to 'completed'
   */
  private async setupReactiveNotifications(): Promise<void> {
    if (!this.repository) return;
    
    try {
      // Subscribe to all order changes and check for status changes to 'completed'
      this.notificationSubscription = this.repository.subscribeToChanges(async () => {
        // This will be called whenever any order document changes
        // We'll implement a more efficient approach using RxDB's reactive queries
      });

      // Set up a reactive query that specifically watches for completed orders
      const db = await getDatabaseInstance();
      const completedOrdersQuery = db.orders.find({
        selector: {
          status: 'completed',
          isDeleted: { $ne: true }
        },
        sort: [{ updatedAt: 'desc' }]
      });

      // Subscribe to changes in completed orders
      completedOrdersQuery.$.subscribe(async (orders) => {
        // Process only orders that haven't been notified yet
        const newlyCompletedOrders = orders.filter(order => {
          return !this.notifiedOrders.has(order.id);
        });

        // Send notifications for newly completed orders
        for (const order of newlyCompletedOrders) {
          // Check if this order was already notified to prevent duplicates
          if (this.notifiedOrders.has(order.id)) {
            console.log(`⏭️ Skipping notification for order ${order.orderNumber} - already notified`);
            continue;
          }

          try {
            // Mark as notified immediately to prevent duplicates
            this.notifiedOrders.add(order.id);
            console.log(`🔔 Processing notification for order ${order.orderNumber} (ID: ${order.id})`);
            
            await customerService.initialize();
            console.log(`🔍 Looking up customer with ID: ${order.customerId} for order ${order.orderNumber}`);
            console.log(`📋 Order details: customerName=${order.customerName}, customerPhone=${order.customerPhone}`);
            
            const customer = await customerService.getCustomerById(order.customerId);
            if (customer) {
              console.log(`✅ Found customer: ${customer.firstName} ${customer.lastName} (ID: ${customer.id})`);
              console.log(`🔔 Reactive notification: Sending notification for order ${order.orderNumber}`);
              await notificationService.sendOrderCompletedNotification(customer, order);
            } else {
              console.error(`❌ No customer found for order ${order.orderNumber} with customerId: ${order.customerId}`);
              
              // Try to find customer by name and phone as fallback
              console.log(`🔍 Attempting fallback lookup by name and phone...`);
              const allCustomers = await customerService.getAllCustomers();
              const customerByPhone = allCustomers.find(c => c.phone === order.customerPhone);
              const customerByName = allCustomers.find(c => 
                `${c.firstName} ${c.lastName}` === order.customerName
              );
              
              if (customerByPhone) {
                console.log(`✅ Found customer by phone: ${customerByPhone.firstName} ${customerByPhone.lastName} (ID: ${customerByPhone.id})`);
                console.log(`🔄 Updating order ${order.orderNumber} with correct customer ID: ${customerByPhone.id}`);
                
                // Update the order with the correct customer ID
                try {
                  const repository = await this.getRepository();
                  await repository.update(order.id, { customerId: customerByPhone.id });
                  console.log(`✅ Order ${order.orderNumber} customer ID updated successfully`);
                } catch (updateError) {
                  console.error(`❌ Failed to update order customer ID:`, updateError);
                }
                
                console.log(`🔔 Reactive notification: Sending notification for order ${order.orderNumber} using phone lookup`);
                await notificationService.sendOrderCompletedNotification(customerByPhone, order);
              } else if (customerByName) {
                console.log(`✅ Found customer by name: ${customerByName.firstName} ${customerByName.lastName} (ID: ${customerByName.id})`);
                console.log(`🔄 Updating order ${order.orderNumber} with correct customer ID: ${customerByName.id}`);
                
                // Update the order with the correct customer ID
                try {
                  const repository = await this.getRepository();
                  await repository.update(order.id, { customerId: customerByName.id });
                  console.log(`✅ Order ${order.orderNumber} customer ID updated successfully`);
                } catch (updateError) {
                  console.error(`❌ Failed to update order customer ID:`, updateError);
                }
                
                console.log(`🔔 Reactive notification: Sending notification for order ${order.orderNumber} using name lookup`);
                await notificationService.sendOrderCompletedNotification(customerByName, order);
              } else {
                console.log(`📋 Available customers in database:`, allCustomers.map(c => ({ 
                  id: c.id, 
                  name: `${c.firstName} ${c.lastName}`, 
                  phone: c.phone 
                })));
              }
            }
          } catch (error) {
            console.error(`Failed to send reactive notification for order ${order.orderNumber}:`, error);
            // Remove from notified set if notification failed, allowing retry
            this.notifiedOrders.delete(order.id);
          }
        }
      });

      console.log('✅ Reactive notification system initialized');
    } catch (error) {
      console.error('Failed to set up reactive notifications:', error);
    }
  }

  async createOrder({
    customer,
    items,
    paymentInfo,
    selectedDate,
    notes,
    barcodeData,
    employee,
    taxRate = 0
  }: {
    customer: SerializableCustomer;
    items: OrderItem[];
    paymentInfo: PaymentInfo;
    selectedDate?: string;
    notes?: string;
    barcodeData?: string;
    employee?: { id: string; name: string };
    taxRate?: number;
  }): Promise<OrderDocument> {
    const repository = await this.getRepository();
    const now = new Date().toISOString();
    const orderNumber = await repository.generateOrderNumber(customer.firstName, customer.lastName, customer.phone);
    
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
      
      // Calculate add-ons price
      const addOnsPrice = item.addOns?.reduce((addOnSum, addOn) => {
        return addOnSum + (addOn.price * addOn.quantity);
      }, 0) || 0;
      
      const totalItemPrice = itemPrice + addOnsPrice;
      
      const discountedPrice = discount > 0 
        ? totalItemPrice * (1 - discount / 100)
        : totalItemPrice;
      return sum + (discountedPrice * quantity);
    }, 0);

    // Convert all monetary values using the cents-based approach
    const subtotal = toPreciseAmount(rawSubtotal);
    const tax = toPreciseAmount(subtotal * taxRate);
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
        itemKey: item.itemKey,
        addOns: item.addOns // Preserve add-ons
      })),
      // Store the exact values calculated with our cents-based approach
      // This ensures they're precisely what the schema expects (multiples of 0.01)
      subtotal: subtotal,
      tax: tax,
      total: total,
      paymentMethod: paymentInfo.method,
      paymentInfo: paymentInfo, // Store complete payment information
      selectedDate,
      status: 'pending',
      statusHistory: initialStatusHistory,
      notes,
      barcodeData,
      isLocalOnly: true, // New orders should always be marked as local-only until synced
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
      version: (currentOrder.version || 1) + 1,
      updatedAt: now.toISOString()
    });

    // Send notifications if order is marked as completed
    if (status === 'completed' && updatedOrder) {
      try {
        await customerService.initialize();
        const customer = await customerService.getCustomerById(updatedOrder.customerId);
        if (customer) {
          console.log(`🔔 Sending notification for completed order ${updatedOrder.orderNumber}`);
          await notificationService.sendOrderCompletedNotification(customer, updatedOrder);
        } else {
          console.error(`❌ No customer found for order ${updatedOrder.orderNumber} with customerId: ${updatedOrder.customerId}`);
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
    const currentOrder = await repository.findById(orderId);
    if (!currentOrder) {
      return null;
    }
    return repository.update(orderId, { 
      rackNumber, 
      version: (currentOrder.version || 1) + 1,
      updatedAt: new Date().toISOString() 
    });
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
      version: (currentOrder.version || 1) + 1,
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
          console.log(`🔔 Sending notification for completed order ${updatedOrder.orderNumber}`);
          await notificationService.sendOrderCompletedNotification(customer, updatedOrder);
        } else {
          console.error(`❌ No customer found for order ${updatedOrder.orderNumber} with customerId: ${updatedOrder.customerId}`);
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

  async generateOrderNumber(customerFirstName?: string, customerLastName?: string, customerPhone?: string): Promise<string> {
    const repository = await this.getRepository();
    
    if (customerFirstName && customerLastName && customerPhone) {
      return repository.generateOrderNumber(customerFirstName, customerLastName, customerPhone);
    } else {
      // Fallback to a generic temporary order number for previews
      const today = new Date();
      const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
      return `TEMP${datePrefix}001`; // Temporary preview number
    }
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
    const currentOrder = await repository.findById(id);
    if (!currentOrder) {
      return null;
    }
    return repository.update(id, {
      ...updateData,
      version: (currentOrder.version || 1) + 1,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Clean up reactive notification subscriptions
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription();
      this.notificationSubscription = null;
    }
    this.notifiedOrders.clear();
  }
}
export const orderService = new OrderService();
