import { RxDocument } from 'rxdb';
import { BaseRepository } from './BaseRepository';
import { EmployeeDocType, EmployeeDocument, EmployeeCollection } from '../schemas/employee';

/**
 * Repository for employee-related database operations
 */
export class EmployeeRepository extends BaseRepository<EmployeeDocType, EmployeeCollection> {
  constructor(collection: EmployeeCollection) {
    super(collection);
    this.idPrefix = 'employee_';
  }

  /**
   * Find an employee by phone number
   */
  async findByPhone(phone: string): Promise<EmployeeDocument | null> {
    const results = await this.collection.find({
      selector: {
        phone,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as EmployeeDocument : null;
  }

  /**
   * Find an employee by email
   */
  async findByEmail(email: string): Promise<EmployeeDocument | null> {
    const results = await this.collection.find({
      selector: {
        email,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as EmployeeDocument : null;
  }

  /**
   * Find an employee by PIN
   */
  async findByPin(pin: string): Promise<EmployeeDocument | null> {
    const results = await this.collection.find({
      selector: {
        pin,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as EmployeeDocument : null;
  }

  /**
   * Search employees by name (first or last name)
   * Uses RxDB's native query capabilities with proper indexing for better performance
   */
  async searchByName(searchTerm: string): Promise<EmployeeDocument[]> {
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
      const fullNameMatches = results.filter(employee => {
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
      
      // Return either the full name matches (if we found any) or the original results
      return fullNameMatches.length > 0 ? fullNameMatches as EmployeeDocument[] : results as EmployeeDocument[];
    }
    
    return results as EmployeeDocument[];
  }

  /**
   * Get all employees that are marked as local only
   */
  async getLocalOnly(): Promise<EmployeeDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as EmployeeDocument[];
  }

  /**
   * Get all employees that are synced with the server
   */
  async getSynced(): Promise<EmployeeDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as EmployeeDocument[];
  }

  /**
   * Count all non-deleted employees
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
   * Bulk upsert employees
   */
  async bulkUpsert(employees: Partial<EmployeeDocType>[]): Promise<void> {
    for (const employee of employees) {
      if (employee.id) {
        const existing = await this.findById(employee.id);
        if (existing) {
          await existing.update({ $set: employee });
          continue;
        }
      }
      await this.collection.insert(employee as EmployeeDocType);
    }
  }

  /**
   * Check if employee exists by email (excluding a specific ID)
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
   * Check if employee exists by phone (excluding a specific ID)
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
   * Check if employee exists by PIN (excluding a specific ID)
   */
  async existsByPin(pin: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      pin,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Search employees across multiple fields
   */
  async search(query: string, limit?: number): Promise<EmployeeDocument[]> {
    if (!query || query.trim() === '') {
      return this.findAll();
    }

    // Get all non-deleted employees first
    const allEmployees = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();

    // Perform in-memory search for better compatibility and more flexible matching
    const searchTerm = query.toLowerCase().trim();
    
    const filteredEmployees = allEmployees.filter(employee => {
      // Search in name fields
      const firstName = employee.firstName?.toLowerCase() || '';
      const lastName = employee.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`;
      
      // Search in email (only if email exists)
      const email = employee.email?.toLowerCase() || '';
      
      // Search in phone (clean both stored phone and search term for phone matching)
      const storedPhone = employee.phone?.replace(/\D/g, '') || '';
      const searchPhone = searchTerm.replace(/\D/g, '');
      
      // Search in PIN
      const pin = employee.pin || '';
      
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
        (employee.phone && employee.phone.toLowerCase().includes(searchTerm)) ||
        // 3. Partial formatted matches (e.g., "555-123" matches "5551234567")
        (searchPhone && searchPhone.length >= 6 && storedPhone.includes(searchPhone)) ||
        // PIN matches
        pin.includes(searchTerm)
      );
    });

    // Apply limit if specified
    const results = limit ? filteredEmployees.slice(0, limit) : filteredEmployees;
    
    return results as EmployeeDocument[];
  }

  /**
   * Subscribe to changes in the employees collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
  
  /**
   * Find employees by business ID
   */
  async findByBusinessId(businessId: string): Promise<EmployeeDocument[]> {
    const results = await this.collection.find({
      selector: {
        businessId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as EmployeeDocument[];
  }

  /**
   * Mark an employee as synced with the server
   * @param localId Local employee ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated employee document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<EmployeeDocument | null> {
    const employee = await this.findById(localId);
    if (!employee) {
      return null;
    }
    
    const updates: Partial<EmployeeDocType> = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updates.amplifyId = amplifyId;
    }
    
    return this.update(localId, updates) as Promise<EmployeeDocument | null>;
  }
}