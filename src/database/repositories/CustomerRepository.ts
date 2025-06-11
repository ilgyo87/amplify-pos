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
   * Uses RxDB's native query capabilities with proper indexing for better performance
   */
  async searchByName(searchTerm: string): Promise<CustomerDocument[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    // For RxDB, we need to use string pattern rather than RegExp object
    // We'll use PouchDB/Mango style regex which needs the pattern without slashes
    const searchPattern = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape regex special chars
    
    // Using mangoQuery with $or to search across multiple fields
    // This leverages the indexes on firstName and lastName
    const results = await this.collection.find({
      selector: {
        $and: [
          { isDeleted: { $ne: true } },
          {
            $or: [
              // Use case insensitive pattern - RxDB will translate this appropriately
              { firstName: { $regex: `(?i)${searchPattern}` } },  
              { lastName: { $regex: `(?i)${searchPattern}` } }
            ]
          }
        ]
      }
    }).exec();
    
    // For full name searches (which can't easily be done in the query),
    // we'll do a second pass in memory, but only on the already filtered results
    if (searchTerm.includes(' ')) {
      const fullNameMatches = results.filter(customer => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
      
      // Return either the full name matches (if we found any) or the original results
      return fullNameMatches.length > 0 ? fullNameMatches as CustomerDocument[] : results as CustomerDocument[];
    }
    
    return results as CustomerDocument[];
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
   * Uses RxDB's count feature instead of loading all records
   */
  async count(): Promise<number> {
    return await this.collection.count({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
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
   * Check if customer exists by email (excluding a specific ID)
   */
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      email,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Check if customer exists by phone (excluding a specific ID)
   */
  async existsByPhone(phone: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      phone,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Search customers across multiple fields, including by order ID/number
   * @returns Array of customer documents with metadata about search match source
   */
  async search(query: string, limit?: number): Promise<Array<CustomerDocument & { fromOrderSearch?: boolean }>> {
    if (!query || query.trim() === '') {
      return this.findAll();
    }

    // Get all non-deleted customers first
    const allCustomers = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();

    // Perform in-memory search for better compatibility and more flexible matching
    const searchTerm = query.toLowerCase().trim();
  
    let filteredCustomers = allCustomers.filter(customer => {
      // Search in name fields
      const firstName = customer.firstName?.toLowerCase() || '';
      const lastName = customer.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`;
      
      // Search in email (only if email exists)
      const email = customer.email?.toLowerCase() || '';
      
      // Search in phone (clean both stored phone and search term for phone matching)
      const storedPhone = customer.phone?.replace(/\D/g, '') || '';
      const searchPhone = searchTerm.replace(/\D/g, '');
      
      // Check various match conditions
      return (
        // Name matches (first name, last name, or full name)
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        // Email matches (if email exists)
        (email && email.includes(searchTerm)) ||
        // Phone matches - multiple strategies:
        // 1. Raw numeric comparison (e.g., "555" matches "5551234567")
        (searchPhone && searchPhone.length >= 3 && storedPhone.includes(searchPhone)) ||
        // 2. Formatted phone search (e.g., "(555)" matches "(555) 123-4567")
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm)) ||
        // 3. Partial formatted matches (e.g., "555-123" matches "5551234567")
        (searchPhone && searchPhone.length >= 6 && storedPhone.includes(searchPhone))
      );
    });

    // Check if search term might be an order ID or order number
    // This is more efficient than fetching all orders since we're likely looking for a specific order
    try {
      // Get the database instance to access orders collection
      const { getDatabaseInstance } = await import('../config');
      const db = await getDatabaseInstance();
      
      // Search for orders where orderNumber includes the search term
      const matchingOrders = await db.orders.find({
        selector: {
          orderNumber: {
            $regex: searchTerm
          },
          isDeleted: { $ne: true }
        }
      }).exec();
      
      // If we found matching orders, add their customers to our results if not already included
      if (matchingOrders.length > 0) {
        // Extract customer IDs from matching orders
        const customerIds = matchingOrders.map(order => order.customerId);
        
        // Find customers that aren't already in our filtered results
        const orderCustomers = allCustomers.filter(customer => 
          customerIds.includes(customer.id) && 
          !filteredCustomers.some(fc => fc.id === customer.id)
        );
        
        // Mark these customers as coming from order search and add them to results
        const orderCustomersWithMetadata = orderCustomers.map(customer => ({
          ...customer,
          fromOrderSearch: true
        }));
        
        // Add these customers to our results
        filteredCustomers = [...filteredCustomers, ...orderCustomersWithMetadata];
      }
    } catch (error) {
      console.error('Error searching orders:', error);
    }

    // Apply limit if specified
    const results = limit ? filteredCustomers.slice(0, limit) : filteredCustomers;
  
    return results as CustomerDocument[];
  }

  /**
   * Subscribe to changes in the customers collection
   * @param callback Function to be called when changes occur
   * @returns Unsubscribe function
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
