import { OrderRepository } from '../repositories/OrderRepository';
import { OrderDocument, OrderDocType } from '../schemas/order';
import { OrderItem } from '../../types/order';
import { SerializableCustomer } from '../../navigation/types';
import { getDatabaseInstance } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { toPreciseAmount } from '../../utils/monetaryUtils';

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
    barcodeData
  }: {
    customer: SerializableCustomer;
    items: OrderItem[];
    paymentMethod: 'cash' | 'card' | 'credit';
    selectedDate?: string;
    notes?: string;
    barcodeData?: string;
  }): Promise<OrderDocument> {
    const repository = await this.getRepository();
    const now = new Date().toISOString();
    const orderNumber = await repository.generateOrderNumber();
    
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

    const orderData: OrderDocType = {
      id: uuidv4(),
      orderNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
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
    return repository.updateStatus(orderId, status);
  }

  async updateOrderRack(orderId: string, rackNumber: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    return repository.update(orderId, { rackNumber, updatedAt: new Date().toISOString() });
  }

  async updateOrderStatusAndRack(orderId: string, status: OrderDocType['status'], rackNumber?: string): Promise<OrderDocument | null> {
    const repository = await this.getRepository();
    const updateData: Partial<OrderDocType> = { 
      status, 
      updatedAt: new Date().toISOString() 
    };
    if (rackNumber) {
      updateData.rackNumber = rackNumber;
    }
    return repository.update(orderId, updateData);
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