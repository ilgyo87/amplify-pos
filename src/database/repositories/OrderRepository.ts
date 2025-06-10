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

  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
    
    const todayOrders = await this.collection.find({
      selector: {
        orderNumber: {
          $regex: `^${datePrefix}.*`
        },
        isDeleted: { $ne: true }
      }
    }).exec();

    const nextNumber = todayOrders.length + 1;
    return `${datePrefix}${nextNumber.toString().padStart(3, '0')}`;
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