import { BaseRepository } from './BaseRepository';
import { OrderDocument, OrderDocType, OrderCollection } from '../schemas/order';

export class OrderRepository extends BaseRepository<OrderDocType, OrderCollection> {
  constructor(collection: OrderCollection) {
    super(collection);
    this.idPrefix = 'order_';
  }

  async findByCustomerId(customerId: string): Promise<OrderDocument[]> {
    return this.collection.find({
      selector: {
        customerId,
        isDeleted: { $ne: true }
      },
      sort: [{ createdAt: 'desc' }]
    }).exec();
  }

  async findByStatus(status: OrderDocType['status']): Promise<OrderDocument[]> {
    return this.collection.find({
      selector: {
        status,
        isDeleted: { $ne: true }
      },
      sort: [{ createdAt: 'desc' }]
    }).exec();
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument | null> {
    return this.collection.findOne({
      selector: {
        orderNumber,
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  async findRecent(limit: number = 50): Promise<OrderDocument[]> {
    return this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      },
      sort: [{ createdAt: 'desc' }],
      limit
    }).exec();
  }

  async generateOrderNumber(customerFirstName: string, customerLastName: string, customerPhone: string): Promise<string> {
    // Get customer initials (first letter of first and last name)
    const firstInitial = customerFirstName.charAt(0).toUpperCase();
    const lastInitial = customerLastName.charAt(0).toUpperCase();
    
    // Extract only digits from phone number
    const phoneDigits = customerPhone.replace(/\D/g, '');
    
    // Create base pattern: initials + phone digits
    const basePattern = `${firstInitial}${lastInitial}${phoneDigits}`;
    
    // Find all existing orders for this customer pattern
    const existingOrders = await this.collection.find({
      selector: {
        orderNumber: {
          $regex: `^${basePattern}`
        },
        isDeleted: { $ne: true }
      }
    }).exec();
    
    // Get the next sequential number (start from 1)
    const nextNumber = existingOrders.length + 1;
    
    // Create final order number: initials + phone + sequential number
    return `${basePattern}${nextNumber}`;
  }

  async updateStatus(orderId: string, status: OrderDocType['status']): Promise<OrderDocument | null> {
    const order = await this.collection.findOne(orderId).exec();
    
    if (!order) {
      return null;
    }

    return order.update({
      $set: {
        status,
        updatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Subscribe to changes in the orders collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to orders with a specific query
   */
  subscribe(query: any, callback: (orders: OrderDocument[]) => void): () => void {
    const subscription = this.collection.find(query).$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
}