import { RxDatabase } from 'rxdb';
import { CustomerDocument, CustomerDocType } from '../schemas/customer';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { CustomerRepository } from '../repositories/CustomerRepository';

/**
 * Service for handling customer-related business logic
 */
export class CustomerService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private customerRepository: CustomerRepository | null = null;

  /**
   * Initialize the service and database connection
   */
  public async initialize(): Promise<void> {
    if (!this.db) {
      try {
        this.db = await getDatabaseInstance();
        this.customerRepository = new CustomerRepository(this.db.customers);
      } catch (error) {
        console.error('Failed to initialize CustomerService:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
  }
  
  /**
   * Get the customer repository instance
   * @throws {Error} If repository is not initialized
   */
  private getRepository(): CustomerRepository {
    if (!this.customerRepository) {
      throw new Error('Customer repository not initialized');
    }
    return this.customerRepository;
  }

  /**
   * Create a new customer
   * @param customerData Customer data without system fields
   * @returns The created customer document
   */
  async createCustomer(
    customerData: Omit<CustomerDocType, 'id' | 'createdAt' | 'updatedAt' | 'isLocalOnly' | 'isDeleted'>
  ): Promise<CustomerDocument> {
    await this.initialize();
    const repository = this.getRepository();
    
    // Set default values for new customers
    const customerWithDefaults = {
      ...customerData,
      isLocalOnly: true,  // New customers are local by default
      isDeleted: false    // Ensure not deleted
    };
    
    return repository.create(customerWithDefaults) as Promise<CustomerDocument>;
  }

  /**
   * Get a customer by ID
   * @param id Customer ID
   * @returns The customer document or null if not found
   */
  async getCustomerById(id: string): Promise<CustomerDocument | null> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findById(id) as Promise<CustomerDocument | null>;
  }

  /**
   * Get all customers
   * @returns Array of customer documents
   */
  async getAllCustomers(): Promise<CustomerDocument[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findAll() as Promise<CustomerDocument[]>;
  }

  /**
   * Update an existing customer
   * @param id Customer ID
   * @param customerData Data to update
   * @returns The updated customer document or null if not found
   */
  async updateCustomer(
    id: string, 
    customerData: Partial<Omit<CustomerDocType, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<CustomerDocument | null> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.update(id, customerData) as Promise<CustomerDocument | null>;
  }

  /**
   * Delete a customer by ID
   * @param id Customer ID
   * @returns True if deleted, false otherwise
   */
  async deleteCustomer(id: string): Promise<boolean> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.softDelete(id);
  }

  /**
   * Search for customers by name
   * @param searchTerm Search term to match against first/last names
   * @returns Array of matching customer documents
   */
  async searchCustomers(searchTerm: string): Promise<CustomerDocument[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.searchByName(searchTerm);
  }

  /**
   * Get local only customers
   * @returns Array of local only customer documents
   */
  async getLocalOnlyCustomers(): Promise<CustomerDocument[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced customers
   * @returns Array of synced customer documents
   */
  async getSyncedCustomers(): Promise<CustomerDocument[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Find a customer by phone number
   * @param phone Phone number to search for
   * @returns The customer document or null if not found
   */
  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findByPhone(phone);
  }

  /**
   * Find a customer by email address
   * @param email Email address to search for
   * @returns The customer document or null if not found
   */
  async findByEmail(email: string): Promise<CustomerDocument | null> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findByEmail(email);
  }

  /**
   * Get all customers that haven't been synced with the server
   * @returns Array of unsynced customer documents
   */
  async getUnsyncedCustomers(): Promise<CustomerDocument[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments() as Promise<CustomerDocument[]>;
  }

  /**
   * Mark a customer as synced with the server
   * @deprecated Use markAsSynced instead
   * @param id Customer ID
   */
  async markCustomerAsSynced(id: string): Promise<void> {
    await this.markAsSynced(id, '');
  }

  /**
   * Mark a customer as synced with the server
   * @param localId Local customer ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated customer document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<CustomerDocument | null> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId) as Promise<CustomerDocument | null>;
  }

  /**
   * Get the total count of customers
   * @returns Number of customers
   */
  async getCustomersCount(): Promise<number> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.count();
  }

  // Subscribe to changes in the customer collection
  /**
   * Subscribe to changes in the customers collection
   * @param callback Function to call when changes occur
   * @returns Unsubscribe function
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    if (!this.customerRepository) {
      // Initialize without waiting to allow subscription to be set up immediately
      this.initialize().catch(console.error);
      // Return a no-op unsubscribe function for now
      return () => {};
    }
    return this.customerRepository.subscribeToChanges(callback);
  }

  // Bulk upsert customers
  /**
   * Bulk upsert multiple customers
   * @param customers Array of customer data to upsert
   */
  async bulkUpsert(customers: Array<Partial<CustomerDocType> & { id: string }>): Promise<void> {
    if (!customers.length) return;
    
    await this.initialize();
    const repository = this.getRepository();
    
    // Process in chunks to avoid overloading the database
    const CHUNK_SIZE = 50;
    for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
      const chunk = customers.slice(i, i + CHUNK_SIZE);
      await repository.bulkUpsert(chunk);
    }
  }
}

export const customerService = new CustomerService();