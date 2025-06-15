import { RxDatabase } from 'rxdb';
import { EmployeeDocument, EmployeeDocType } from '../schemas/employee';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { validateEmployeeForm, checkForEmployeeDuplicates, EmployeeFormData, EmployeeValidationErrors } from '../../utils/employeeValidation';
import { cleanPhoneNumber } from '../../utils/phoneUtils';

/**
 * Service for handling employee-related business logic
 */
export class EmployeeService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private employeeRepository: EmployeeRepository | null = null;

  /**
   * Initialize the service and database connection
   */
  public async initialize(): Promise<void> {
    try {
      this.db = await getDatabaseInstance();
      this.employeeRepository = new EmployeeRepository(this.db.employees);
      console.log('EmployeeService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EmployeeService:', error);
      throw new Error('Failed to initialize database connection');
    }
  }
  
  /**
   * Get the employee repository instance
   * @throws {Error} If repository is not initialized
   */
  private getRepository(): EmployeeRepository {
    if (!this.employeeRepository) {
      throw new Error('Employee repository not initialized');
    }
    return this.employeeRepository;
  }

  /**
   * Create a new employee with validation
   * @param employeeData Employee data
   * @returns Object with employee document and validation errors
   */
  async createEmployee(
    employeeData: EmployeeFormData
  ): Promise<{ employee?: EmployeeDocument; errors?: EmployeeValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateEmployeeForm(employeeData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates
    const duplicateCheck = await checkForEmployeeDuplicates(
      employeeData,
      (email, excludeId) => repository.existsByEmail(email, excludeId),
      (phone, excludeId) => repository.existsByPhone(cleanPhoneNumber(phone), excludeId),
      (pin, excludeId) => repository.existsByPin(pin, excludeId),
      undefined
    );

    if (duplicateCheck.isDuplicate) {
      let field = '';
      switch (duplicateCheck.field) {
        case 'email':
          field = 'email address';
          break;
        case 'phone':
          field = 'phone number';
          break;
        case 'pin':
          field = 'PIN';
          break;
      }
      return { duplicateError: `An employee with this ${field} already exists` };
    }

    // Set default values for new employees
    const employeeWithDefaults = {
      ...employeeData,
      phone: cleanPhoneNumber(employeeData.phone),
      isActive: true,
      // Only set isLocalOnly to true if it's not already specified in the data
      // This allows synced employees from Amplify to have isLocalOnly: false
      isLocalOnly: employeeData.isLocalOnly !== undefined ? employeeData.isLocalOnly : true,
      isDeleted: false
    };
    
    const employee = await repository.create(employeeWithDefaults) as EmployeeDocument;
    return { employee };
  }

  /**
   * Get an employee by ID
   * @param id Employee ID
   * @returns The employee document or null if not found
   */
  async getEmployeeById(id: string): Promise<EmployeeDocument | null> {
    const repository = this.getRepository();
    return repository.findById(id) as Promise<EmployeeDocument | null>;
  }

  /**
   * Get all employees
   * @returns Array of employee documents
   */
  async getAllEmployees(): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    const employees = await repository.findAll() as EmployeeDocument[];
    console.log('getAllEmployees returned:', employees.length, 'employees');
    return employees;
  }

  /**
   * Update an existing employee with validation
   * @param id Employee ID
   * @param employeeData Data to update
   * @returns Object with updated employee document and validation errors
   */
  async updateEmployee(
    id: string, 
    employeeData: EmployeeFormData
  ): Promise<{ employee?: EmployeeDocument; errors?: EmployeeValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateEmployeeForm(employeeData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates (excluding current employee)
    const duplicateCheck = await checkForEmployeeDuplicates(
      employeeData,
      (email, excludeId) => repository.existsByEmail(email, excludeId),
      (phone, excludeId) => repository.existsByPhone(cleanPhoneNumber(phone), excludeId),
      (pin, excludeId) => repository.existsByPin(pin, excludeId),
      id
    );

    if (duplicateCheck.isDuplicate) {
      let field = '';
      switch (duplicateCheck.field) {
        case 'email':
          field = 'email address';
          break;
        case 'phone':
          field = 'phone number';
          break;
        case 'pin':
          field = 'PIN';
          break;
      }
      return { duplicateError: `An employee with this ${field} already exists` };
    }

    const updateData = {
      ...employeeData,
      phone: cleanPhoneNumber(employeeData.phone)
    };

    const employee = await repository.update(id, updateData) as EmployeeDocument | null;
    return { employee: employee || undefined };
  }

  /**
   * Delete an employee by ID
   * @param id Employee ID
   * @returns True if deleted, false otherwise
   */
  async deleteEmployee(id: string): Promise<boolean> {
    const repository = this.getRepository();
    return repository.softDelete(id);
  }

  /**
   * Search for employees across multiple fields
   * @param searchTerm Search term to match against name, email, phone, pin
   * @param limit Optional limit for results
   * @returns Array of matching employee documents
   */
  async searchEmployees(searchTerm: string, limit?: number): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    return repository.search(searchTerm, limit);
  }

  /**
   * Search for employees by name only
   * @param searchTerm Search term to match against first/last names
   * @returns Array of matching employee documents
   */
  async searchEmployeesByName(searchTerm: string): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    return repository.searchByName(searchTerm);
  }

  /**
   * Get local only employees
   * @returns Array of local only employee documents
   */
  async getLocalOnlyEmployees(): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced employees
   * @returns Array of synced employee documents
   */
  async getSyncedEmployees(): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Find an employee by phone number
   * @param phone Phone number to search for
   * @returns The employee document or null if not found
   */
  async findByPhone(phone: string): Promise<EmployeeDocument | null> {
    const repository = this.getRepository();
    return repository.findByPhone(phone);
  }

  /**
   * Find an employee by email address
   * @param email Email address to search for
   * @returns The employee document or null if not found
   */
  async findByEmail(email: string): Promise<EmployeeDocument | null> {
    const repository = this.getRepository();
    return repository.findByEmail(email);
  }

  /**
   * Find an employee by PIN
   * @param pin PIN to search for
   * @returns The employee document or null if not found
   */
  async findByPin(pin: string): Promise<EmployeeDocument | null> {
    const repository = this.getRepository();
    return repository.findByPin(pin);
  }

  /**
   * Get all employees that haven't been synced with the server
   * @param forceRefresh If true, forces a fresh query ignoring any cached results
   * @returns Array of unsynced employee documents
   */
  async getUnsyncedEmployees(forceRefresh = false): Promise<EmployeeDocument[]> {
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments(forceRefresh) as Promise<EmployeeDocument[]>;
  }

  /**
   * Mark an employee as synced with the server
   * @deprecated Use markAsSynced instead
   * @param id Employee ID
   */
  async markEmployeeAsSynced(id: string): Promise<void> {
    await this.markAsSynced(id, '');
  }

  /**
   * Mark an employee as synced with the server
   * @param localId Local employee ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated employee document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<EmployeeDocument | null> {
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId) as Promise<EmployeeDocument | null>;
  }

  /**
   * Get the total count of employees
   * @returns Number of employees
   */
  async getEmployeesCount(): Promise<number> {
    const repository = this.getRepository();
    return repository.count();
  }

  // Subscribe to changes in the employee collection
  /**
   * Subscribe to changes in the employees collection
   * @param callback Function to call when changes occur
   * @returns Unsubscribe function
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    if (!this.employeeRepository) {
      console.error('Employee repository not initialized');
      // Return a no-op unsubscribe function since we can't subscribe yet
      return () => {};
    }
    return this.employeeRepository.subscribeToChanges(callback);
  }

  // Bulk upsert employees
  /**
   * Bulk upsert multiple employees
   * @param employees Array of employee data to upsert
   */
  async bulkUpsert(employees: Array<Partial<EmployeeDocType> & { id: string }>): Promise<void> {
    if (!employees.length) return;
    
    const repository = this.getRepository();
    
    // Process in chunks to avoid overloading the database
    const CHUNK_SIZE = 50;
    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      await repository.bulkUpsert(chunk);
    }
  }
}

export const employeeService = new EmployeeService();