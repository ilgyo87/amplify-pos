import { RxDatabase } from 'rxdb';
import { CustomerDocument, CustomerDocType } from '../schemas/customer';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { validateCustomerForm, checkForDuplicates, CustomerFormData, ValidationErrors } from '../../utils/customerValidation';
import { cleanPhoneNumber } from '../../utils/phoneUtils';

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
   * Create a new customer with validation
   * @param customerData Customer data
   * @returns Object with customer document and validation errors
   */
  async createCustomer(
    customerData: CustomerFormData
  ): Promise<{ customer?: CustomerDocument; errors?: ValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateCustomerForm(customerData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates
    const duplicateCheck = await checkForDuplicates(
      customerData,
      (email, excludeId) => repository.existsByEmail(email, excludeId),
      (phone, excludeId) => repository.existsByPhone(cleanPhoneNumber(phone), excludeId),
      undefined
    );

    if (duplicateCheck.isDuplicate) {
      const field = duplicateCheck.field === 'email' ? 'email address' : 'phone number';
      return { duplicateError: `A customer with this ${field} already exists` };
    }

    // Get a valid businessId for the customer
    let businessId = '';
    try {
      const { businessService } = await import('./businessService');
      await businessService.initialize();
      const businesses = await businessService.getAllBusinesses();
      if (businesses.length > 0) {
        businessId = businesses[0].id;
        console.log(`[CUSTOMER CREATE] Using business ID ${businessId} for new customer`);
      }
    } catch (error) {
      console.error('Error getting business for new customer:', error);
    }

    // Set default values for new customers
    // Note: isLocalOnly will be handled by BaseRepository.create() which respects the field if present
    const customerWithDefaults = {
      ...customerData,
      phone: cleanPhoneNumber(customerData.phone),
      businessId: businessId,
      isDeleted: false
    };
    
    const customer = await repository.create(customerWithDefaults) as CustomerDocument;
    return { customer };
  }

  /**
   * Get a customer by ID
   * @param id Customer ID
   * @returns The customer document or null if not found
   */
  async getCustomerById(id: string): Promise<CustomerDocument | null> {
    const repository = this.getRepository();
    return repository.findById(id) as Promise<CustomerDocument | null>;
  }

  /**
   * Get all customers
   * @returns Array of customer documents
   */
  async getAllCustomers(): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.findAll() as Promise<CustomerDocument[]>;
  }

  /**
   * Update an existing customer with validation
   * @param id Customer ID
   * @param customerData Data to update
   * @returns Object with updated customer document and validation errors
   */
  async updateCustomer(
    id: string, 
    customerData: CustomerFormData
  ): Promise<{ customer?: CustomerDocument; errors?: ValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateCustomerForm(customerData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates (excluding current customer)
    const duplicateCheck = await checkForDuplicates(
      customerData,
      (email: string, excludeId?: string) => repository.existsByEmail(email, excludeId),
      (phone: string, excludeId?: string) => repository.existsByPhone(cleanPhoneNumber(phone), excludeId),
      id
    );

    if (duplicateCheck.isDuplicate) {
      const field = duplicateCheck.field === 'email' ? 'email address' : 'phone number';
      return { duplicateError: `A customer with this ${field} already exists` };
    }

    const updateData = {
      ...customerData,
      phone: cleanPhoneNumber(customerData.phone)
    };

    const customer = await repository.update(id, updateData) as CustomerDocument | null;
    return { customer: customer || undefined };
  }

  /**
   * Delete a customer by ID
   * @param id Customer ID
   * @returns True if deleted, false otherwise
   */
  async deleteCustomer(id: string): Promise<boolean> {
    const repository = this.getRepository();
    return repository.softDelete(id);
  }

  /**
   * Search for customers across multiple fields
   * @param searchTerm Search term to match against name, email, phone
   * @param limit Optional limit for results
   * @returns Array of matching customer documents
   */
  async searchCustomers(searchTerm: string, limit?: number): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.search(searchTerm, limit);
  }

  /**
   * Search for customers by name only
   * @param searchTerm Search term to match against first/last names
   * @returns Array of matching customer documents
   */
  async searchCustomersByName(searchTerm: string): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.searchByName(searchTerm);
  }

  /**
   * Get local only customers
   * @returns Array of local only customer documents
   */
  async getLocalOnlyCustomers(): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced customers
   * @returns Array of synced customer documents
   */
  async getSyncedCustomers(): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Find a customer by phone number
   * @param phone Phone number to search for
   * @returns The customer document or null if not found
   */
  async findByPhone(phone: string): Promise<CustomerDocument | null> {
    const repository = this.getRepository();
    return repository.findByPhone(phone);
  }

  /**
   * Find a customer by email address
   * @param email Email address to search for
   * @returns The customer document or null if not found
   */
  async findByEmail(email: string): Promise<CustomerDocument | null> {
    const repository = this.getRepository();
    return repository.findByEmail(email);
  }

  /**
   * Get all customers that haven't been synced with the server
   * @param forceRefresh If true, forces a fresh query ignoring any cached results
   * @returns Array of unsynced customer documents
   */
  async getUnsyncedCustomers(forceRefresh = false): Promise<CustomerDocument[]> {
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments(forceRefresh) as Promise<CustomerDocument[]>;
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
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId) as Promise<CustomerDocument | null>;
  }

  /**
   * Get the total count of customers
   * @returns Number of customers
   */
  async getCustomersCount(): Promise<number> {
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
      console.error('Customer repository not initialized');
      // Return a no-op unsubscribe function since we can't subscribe yet
      return () => {};
    }
    return this.customerRepository.subscribeToChanges(callback);
  }

  /**
   * Subscribe to changes for a specific customer
   * @param customerId Customer ID to watch for changes
   * @param callback Function to call when the customer changes
   * @returns Unsubscribe function
   */
  subscribeToCustomerChanges(customerId: string, callback: (customer: CustomerDocument | null) => void): () => void {
    if (!this.customerRepository) {
      console.error('Customer repository not initialized');
      return () => {};
    }

    console.log(`🔔 Setting up customer subscription for ID: ${customerId}`);

    return this.customerRepository.subscribeToChanges(async (change: any) => {
      console.log(`🔔 Customer change detected:`, {
        changeType: change?.operation,
        documentId: change?.documentId,
        targetCustomerId: customerId,
        isMatch: change.documentId === customerId || (change.documentData && change.documentData.id === customerId)
      });

      // Check if the change affects our specific customer
      if (change.documentId === customerId || 
          (change.documentData && change.documentData.id === customerId)) {
        try {
          console.log(`🔄 Fetching updated customer data for ${customerId}`);
          const updatedCustomer = await this.getCustomerById(customerId);
          console.log(`✅ Calling callback with updated customer:`, {
            id: updatedCustomer?.id,
            emailNotifications: updatedCustomer?.emailNotifications,
            textNotifications: updatedCustomer?.textNotifications
          });
          callback(updatedCustomer);
        } catch (error) {
          console.error('Error fetching updated customer:', error);
          callback(null);
        }
      }
    });
  }

  // Bulk upsert customers
  /**
   * Bulk upsert multiple customers
   * @param customers Array of customer data to upsert
   */
  async bulkUpsert(customers: Array<Partial<CustomerDocType> & { id: string }>): Promise<void> {
    if (!customers.length) return;
    
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