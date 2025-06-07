import { RxDocument } from 'rxdb';
import { BaseRepository } from './BaseRepository';
import { CustomerDocType, CustomerDocument, CustomerCollection } from '../schemas/customer';

/**
 * Repository for customer-related database operations
 */
export class CustomerRepository extends BaseRepository<CustomerDocType, CustomerCollection> {
  constructor(collection: CustomerCollection) {
    super(collection);
  }

  /**
   * Find a customer by phone number
   */
  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    const results = await this.collection.find({
      selector: {
        phone,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as CustomerDocument : null;
  }

  /**
   * Find a customer by email
   */
  async findByEmail(email: string): Promise<CustomerDocument | null> {
    const results = await this.collection.find({
      selector: {
        email,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as CustomerDocument : null;
  }

  /**
   * Search customers by name (first or last name)
   */
  async searchByName(searchTerm: string): Promise<CustomerDocument[]> {
    const allCustomers = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
    
    const searchTermLower = searchTerm.toLowerCase();
    return allCustomers.filter(customer => 
      customer.firstName.toLowerCase().includes(searchTermLower) ||
      customer.lastName.toLowerCase().includes(searchTermLower) ||
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTermLower)
    ) as CustomerDocument[];
  }

  /**
   * Get all customers that are marked as local only
   */
  async getLocalOnly(): Promise<CustomerDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CustomerDocument[];
  }

  /**
   * Get all customers that are synced with the server
   */
  async getSynced(): Promise<CustomerDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CustomerDocument[];
  }

  /**
   * Count all non-deleted customers
   */
  async count(): Promise<number> {
    const results = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length;
  }

  /**
   * Bulk upsert customers
   */
  async bulkUpsert(customers: Partial<CustomerDocType>[]): Promise<void> {
    for (const customer of customers) {
      if (customer.id) {
        const existing = await this.findById(customer.id);
        if (existing) {
          await existing.update({ $set: customer });
          continue;
        }
      }
      await this.collection.insert(customer as CustomerDocType);
    }
  }

  /**
   * Subscribe to changes in the customers collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
  
  /**
   * Find customers by business ID
   */
  async findByBusinessId(businessId: string): Promise<CustomerDocument[]> {
    const results = await this.collection.find({
      selector: {
        businessId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CustomerDocument[];
  }

  /**
   * Mark a customer as synced with the server
   * @param localId Local customer ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated customer document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<CustomerDocument | null> {
    const customer = await this.findById(localId);
    if (!customer) {
      return null;
    }
    
    const updates: Partial<CustomerDocType> = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updates.amplifyId = amplifyId;
    }
    
    return this.update(localId, updates) as Promise<CustomerDocument | null>;
  }
}
