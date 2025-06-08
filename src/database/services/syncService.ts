import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { customerService } from './customerService';
import { CustomerDocument } from '../schemas/customer';
import { employeeService } from './employeeService';
import { EmployeeDocument } from '../schemas/employee';
import { categoryService } from './categoryService';
import { CategoryDocument } from '../schemas/category';
import { productService } from './productService';
import { ProductDocument } from '../schemas/product';

const client = generateClient<Schema>();

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  errors: string[];
}

export interface SyncStatus {
  isUploading: boolean;
  isDownloading: boolean;
  lastSyncDate?: Date;
  totalLocalCustomers: number;
  totalUnsyncedCustomers: number;
  totalLocalEmployees: number;
  totalUnsyncedEmployees: number;
  customersUploaded: number;
  customersDownloaded: number;
  employeesUploaded: number;
  employeesDownloaded: number;
  categoriesUploaded: number;
  categoriesDownloaded: number;
  productsUploaded: number;
  productsDownloaded: number;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
}

export class SyncService {
  private isUploading = false;
  private isDownloading = false;
  private lastSyncDate?: Date;

  /**
   * Convert customer from local format to Amplify format
   */
  private convertToAmplifyFormat(customer: CustomerDocument): any {
    // Using type assertion to bypass type checking issues
    const doc = customer as any;
    const amplifyData: any = {
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
      address: doc.address,
      notes: doc.notes,
      joinDate: doc.joinDate,
    };

    // Only include email if it has a valid value
    if (doc.email && doc.email.trim()) {
      amplifyData.email = doc.email;
    }

    return amplifyData;
  }

  /**
   * Convert customer from Amplify format to local format
   */
  private convertToLocalFormat(amplifyCustomer: any): any {
    const localData: any = {
      firstName: amplifyCustomer.firstName,
      lastName: amplifyCustomer.lastName,
      phone: amplifyCustomer.phone,
      address: amplifyCustomer.address,
      notes: amplifyCustomer.notes,
      joinDate: amplifyCustomer.joinDate,
      amplifyId: amplifyCustomer.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };

    // Only include email if it exists and has a value
    if (amplifyCustomer.email) {
      localData.email = amplifyCustomer.email;
    }

    return localData;
  }

  /**
   * Convert employee from local format to Amplify format
   */
  private convertEmployeeToAmplifyFormat(employee: EmployeeDocument): any {
    // Using type assertion to bypass type checking issues
    const doc = employee as any;
    const amplifyData: any = {
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
      pin: doc.pin,
    };

    // Only include optional fields if they exist
    if (doc.email && doc.email.trim()) {
      amplifyData.email = doc.email;
    }
    
    if (doc.address && doc.address.trim()) {
      amplifyData.address = doc.address;
    }
    
    if (doc.city && doc.city.trim()) {
      amplifyData.city = doc.city;
    }
    
    if (doc.state && doc.state.trim()) {
      amplifyData.state = doc.state;
    }
    
    if (doc.zipCode && doc.zipCode.trim()) {
      amplifyData.zipCode = doc.zipCode;
    }
    
    if (doc.businessId && doc.businessId.trim()) {
      amplifyData.businessId = doc.businessId;
    }

    return amplifyData;
  }

  /**
   * Convert employee from Amplify format to local format
   */
  private convertEmployeeToLocalFormat(amplifyEmployee: any): any {
    const localData: any = {
      firstName: amplifyEmployee.firstName,
      lastName: amplifyEmployee.lastName,
      phone: amplifyEmployee.phone,
      pin: amplifyEmployee.pin,
      amplifyId: amplifyEmployee.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };

    // Only include optional fields if they exist and have values
    if (amplifyEmployee.email) {
      localData.email = amplifyEmployee.email;
    }
    
    if (amplifyEmployee.address) {
      localData.address = amplifyEmployee.address;
    }
    
    if (amplifyEmployee.city) {
      localData.city = amplifyEmployee.city;
    }
    
    if (amplifyEmployee.state) {
      localData.state = amplifyEmployee.state;
    }
    
    if (amplifyEmployee.zipCode) {
      localData.zipCode = amplifyEmployee.zipCode;
    }
    
    if (amplifyEmployee.businessId) {
      localData.businessId = amplifyEmployee.businessId;
    }

    return localData;
  }

  /**
   * Convert category from local format to Amplify format
   */
  private convertCategoryToAmplifyFormat(category: CategoryDocument): any {
    // Using type assertion to bypass type checking issues
    const doc = category as any;
    return {
      name: doc.name,
      description: doc.description,
      color: doc.color,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
    };
  }

  /**
   * Convert category from Amplify format to local format
   */
  private convertCategoryToLocalFormat(amplifyCategory: any): any {
    return {
      name: amplifyCategory.name,
      description: amplifyCategory.description,
      color: amplifyCategory.color,
      displayOrder: amplifyCategory.displayOrder,
      isActive: amplifyCategory.isActive,
      amplifyId: amplifyCategory.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };
  }

  /**
   * Convert product from local format to Amplify format
   */
  private convertProductToAmplifyFormat(product: ProductDocument): any {
    // Using type assertion to bypass type checking issues
    const doc = product as any;
    return {
      name: doc.name,
      description: doc.description,
      sku: doc.sku,
      price: doc.price,
      cost: doc.cost,
      categoryId: doc.categoryId,
      barcode: doc.barcode,
      quantity: doc.quantity,
      isActive: doc.isActive,
    };
  }

  /**
   * Convert product from Amplify format to local format
   */
  private fromProductApiModel(amplifyProduct: any): any {
    // Return product document compatible with RxDB/React Native
    // (avoiding date-time format per memory)
    return {
      name: amplifyProduct.name,
      description: amplifyProduct.description,
      sku: amplifyProduct.sku,
      price: amplifyProduct.price,
      cost: amplifyProduct.cost,
      categoryId: amplifyProduct.categoryId,
      barcode: amplifyProduct.barcode,
      quantity: amplifyProduct.quantity,
      isActive: amplifyProduct.isActive,
      amplifyId: amplifyProduct.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    await customerService.initialize();
    await employeeService.initialize();
    await categoryService.initialize();
    await productService.initialize();
    
    const totalLocalCustomers = await customerService.getCustomersCount();
    const unsyncedCustomers = await customerService.getUnsyncedCustomers();
    const totalLocalEmployees = await employeeService.getEmployeesCount();
    const unsyncedEmployees = await employeeService.getUnsyncedEmployees();
    
    return {
      isUploading: this.isUploading,
      isDownloading: this.isDownloading,
      lastSyncDate: this.lastSyncDate,
      totalLocalCustomers,
      totalUnsyncedCustomers: unsyncedCustomers.length,
      totalLocalEmployees,
      totalUnsyncedEmployees: unsyncedEmployees.length,
      customersUploaded: 0,
      customersDownloaded: 0,
      employeesUploaded: 0,
      employeesDownloaded: 0,
      categoriesUploaded: 0,
      categoriesDownloaded: 0,
      productsUploaded: 0,
      productsDownloaded: 0,
      startTime: new Date(),
      endTime: undefined,
      success: false
    };
  }

  /**
   * Upload all local customers to Amplify
   */
  async uploadCustomers(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await customerService.initialize();
      const unsyncedCustomers = await customerService.getUnsyncedCustomers();

      console.log(`Starting upload of ${unsyncedCustomers.length} customers...`);

      for (const customer of unsyncedCustomers) {
        try {
          // Convert local customer to Amplify format
          const amplifyCustomer = this.convertToAmplifyFormat(customer);
          
          // Create customer in Amplify
          // Using 'as any' to bypass type checking issues with the client model types
          if (!client.models || !client.models.Customer) {
            throw new Error('Amplify Customer model not configured. Please check your Amplify setup.');
          }
          const response = await (client.models as any).Customer.create(amplifyCustomer);
          
          if (response.data) {
            // Mark as synced in local database
            await customerService.markAsSynced(customer.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded customer: ${customer.firstName} ${customer.lastName}`);
          } else if (response.errors) {
            const error = `Failed to upload ${customer.firstName} ${customer.lastName}: ${response.errors.map((e: any) => e.message).join(', ')}`;
            errors.push(error);
            console.error(error);
          }
        } catch (error) {
          const errorMsg = `Error uploading ${customer.firstName} ${customer.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();
      
      return {
        success: errors.length === 0,
        uploadedCount,
        downloadedCount: 0,
        errors
      };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Download customers from Amplify and sync to local database
   */
  async downloadCustomers(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;

    try {
      await customerService.initialize();
      
      console.log('Starting download of customers from Amplify...');

      // Get all customers from Amplify
      if (!client.models || !client.models.Customer) {
        throw new Error('Amplify models not configured. Please check your Amplify setup.');
      }
      const response = await (client.models as any).Customer.list();
      
      if (response.errors) {
        errors.push(`Failed to fetch customers: ${response.errors.map((e: any) => e.message).join(', ')}`);
        return {
          success: false,
          uploadedCount: 0,
          downloadedCount: 0,
          errors
        };
      }

      const amplifyCustomers = response.data || [];

      for (const amplifyCustomer of amplifyCustomers) {
        try {
          // Check if customer already exists locally by amplifyId
          const existingCustomers = await customerService.getAllCustomers();
          const existingCustomer = existingCustomers.find(c => c.amplifyId === amplifyCustomer.id);

          if (existingCustomer) {
            // Update existing customer if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyCustomer.updatedAt);
            const localUpdatedAt = new Date(existingCustomer.updatedAt);
            
            if (amplifyUpdatedAt > localUpdatedAt) {
              const localFormat = this.convertToLocalFormat(amplifyCustomer);
              const result = await customerService.updateCustomer(existingCustomer.id, localFormat);
              if (result.customer && !result.errors && !result.duplicateError) {
                downloadedCount++;
                console.log(`Updated customer: ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}`);
              }
            }
          } else {
            // Create new local customer
            const localFormat = this.convertToLocalFormat(amplifyCustomer);
            const result = await customerService.createCustomer(localFormat);
            
            if (result.customer) {
              // Mark as synced since it came from Amplify
              await customerService.markAsSynced(result.customer.id, amplifyCustomer.id);
              downloadedCount++;
              console.log(`Downloaded new customer: ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}`);
            } else if (result.errors || result.duplicateError) {
              const errorMsg = result.duplicateError || Object.values(result.errors || {}).join(', ');
              errors.push(`Failed to create ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = `Error processing ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();

      return {
        success: errors.length === 0,
        uploadedCount: 0,
        downloadedCount,
        errors
      };
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Upload all local employees to Amplify
   */
  async uploadEmployees(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await employeeService.initialize();
      const unsyncedEmployees = await employeeService.getUnsyncedEmployees();

      console.log(`Starting upload of ${unsyncedEmployees.length} employees...`);

      for (const employee of unsyncedEmployees) {
        try {
          // Convert local employee to Amplify format
          const amplifyEmployee = this.convertEmployeeToAmplifyFormat(employee);
          
          // Create employee in Amplify
          // Using 'as any' to bypass type checking issues with the client model types
          if (!client.models || !client.models.Employee) {
            throw new Error('Amplify Employee model not configured. Please check your Amplify setup.');
          }
          const response = await (client.models as any).Employee.create(amplifyEmployee);
          
          if (response.data) {
            // Mark as synced in local database
            await employeeService.markAsSynced(employee.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded employee: ${employee.firstName} ${employee.lastName}`);
          } else if (response.errors) {
            const error = `Failed to upload ${employee.firstName} ${employee.lastName}: ${response.errors.map((e: any) => e.message).join(', ')}`;
            errors.push(error);
            console.error(error);
          }
        } catch (error) {
          const errorMsg = `Error uploading ${employee.firstName} ${employee.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();
      
      return {
        success: errors.length === 0,
        uploadedCount,
        downloadedCount: 0,
        errors
      };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Download employees from Amplify and sync to local database
   */
  /**
   * Upload all local categories to Amplify
   */
  async uploadCategories(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await categoryService.initialize();
      const unsyncedCategories = await categoryService.getUnsyncedCategories();

      console.log(`Starting upload of ${unsyncedCategories.length} categories...`);

      for (const category of unsyncedCategories) {
        try {
          // Convert local category to Amplify format
          const amplifyCategory = this.convertCategoryToAmplifyFormat(category);
          
          // Create category in Amplify
          // Using 'as any' to bypass type checking issues with the client model types
          const response = await (client.models as any).Category.create(amplifyCategory);
          
          if (response.data) {
            // Mark as synced in local database
            await categoryService.markAsSynced(category.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded category: ${category.name}`);
          } else if (response.errors) {
            const error = `Failed to upload category ${category.name}: ${response.errors.map((e: any) => e.message).join(', ')}`;
            errors.push(error);
            console.error(error);
          }
        } catch (error) {
          const errorMsg = `Error uploading category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();
      
      return {
        success: errors.length === 0,
        uploadedCount,
        downloadedCount: 0,
        errors
      };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Upload all local products to Amplify
   */
  async uploadProducts(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await productService.initialize();
      const unsyncedProducts = await productService.getUnsyncedProducts();

      console.log(`Starting upload of ${unsyncedProducts.length} products...`);

      for (const product of unsyncedProducts) {
        try {
          // Convert local product to Amplify format
          const amplifyProduct = this.convertProductToAmplifyFormat(product);
          
          // Create product in Amplify
          // Using 'as any' to bypass type checking issues with the client model types
          const response = await (client.models as any).Product.create(amplifyProduct);
          
          if (response.data) {
            // Mark as synced in local database
            await productService.markAsSynced(product.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded product: ${product.name}`);
          } else if (response.errors) {
            const error = `Failed to upload product ${product.name}: ${response.errors.map((e: any) => e.message).join(', ')}`;
            errors.push(error);
            console.error(error);
          }
        } catch (error) {
          const errorMsg = `Error uploading product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();
      
      return {
        success: errors.length === 0,
        uploadedCount,
        downloadedCount: 0,
        errors
      };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Download categories from Amplify and sync to local database
   */
  async downloadCategories(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;

    try {
      await categoryService.initialize();
      
      console.log('Starting download of categories from Amplify...');

      // Get all categories from Amplify
      if (!client.models || !client.models.Category) {
        throw new Error('Amplify Category model not configured. Please check your Amplify setup.');
      }
      const response = await (client.models as any).Category.list();
      
      if (response.errors) {
        errors.push(`Failed to fetch categories: ${response.errors.map((e: any) => e.message).join(', ')}`);
        return {
          success: false,
          uploadedCount: 0,
          downloadedCount: 0,
          errors
        };
      }

      const amplifyCategories = response.data || [];

      for (const amplifyCategory of amplifyCategories) {
        try {
          // Check if category already exists locally by amplifyId
          const existingCategories = await categoryService.getAllCategories();
          const existingCategory = existingCategories.find(c => c.amplifyId === amplifyCategory.id);

          if (existingCategory) {
            // Update existing category if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyCategory.updatedAt);
            const localUpdatedAt = new Date(existingCategory.updatedAt);
            
            if (amplifyUpdatedAt > localUpdatedAt) {
              const localFormat = this.convertCategoryToLocalFormat(amplifyCategory);
              const result = await categoryService.updateCategory(existingCategory.id, localFormat);
              if (result.category && !result.errors) {
                downloadedCount++;
                console.log(`Updated category: ${amplifyCategory.name}`);
              }
            }
          } else {
            // Create new local category
            const localFormat = this.convertCategoryToLocalFormat(amplifyCategory);
            const result = await categoryService.createCategory(localFormat);
            
            if (result.category) {
              // Mark as synced since it came from Amplify
              await categoryService.markAsSynced(result.category.id, amplifyCategory.id);
              downloadedCount++;
              console.log(`Downloaded new category: ${amplifyCategory.name}`);
            } else if (result.errors) {
              const errorMsg = Object.values(result.errors || {}).join(', ');
              errors.push(`Failed to create category ${amplifyCategory.name}: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = `Error processing ${amplifyCategory.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();

      return {
        success: errors.length === 0,
        uploadedCount: 0,
        downloadedCount,
        errors
      };
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Download employees from Amplify and sync to local database
   */
  async downloadEmployees(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;

    try {
      await employeeService.initialize();
      
      console.log('Starting download of employees from Amplify...');

      // Get all employees from Amplify
      if (!client.models || !client.models.Employee) {
        throw new Error('Amplify Employee model not configured. Please check your Amplify setup.');
      }
      const response = await (client.models as any).Employee.list();
      
      if (response.errors) {
        errors.push(`Failed to fetch employees: ${response.errors.map((e: any) => e.message).join(', ')}`);
        return {
          success: false,
          uploadedCount: 0,
          downloadedCount: 0,
          errors
        };
      }

      const amplifyEmployees = response.data || [];

      for (const amplifyEmployee of amplifyEmployees) {
        try {
          // Check if employee already exists locally by amplifyId
          const existingEmployees = await employeeService.getAllEmployees();
          const existingEmployee = existingEmployees.find(e => e.amplifyId === amplifyEmployee.id);

          if (existingEmployee) {
            // Update existing employee if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyEmployee.updatedAt);
            const localUpdatedAt = new Date(existingEmployee.updatedAt);
            
            if (amplifyUpdatedAt > localUpdatedAt) {
              const localFormat = this.convertEmployeeToLocalFormat(amplifyEmployee);
              const result = await employeeService.updateEmployee(existingEmployee.id, localFormat);
              if (result.employee && !result.errors && !result.duplicateError) {
                downloadedCount++;
                console.log(`Updated employee: ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}`);
              }
            }
          } else {
            // Create new local employee
            const localFormat = this.convertEmployeeToLocalFormat(amplifyEmployee);
            const result = await employeeService.createEmployee(localFormat);
            
            if (result.employee) {
              // Mark as synced since it came from Amplify
              await employeeService.markAsSynced(result.employee.id, amplifyEmployee.id);
              downloadedCount++;
              console.log(`Downloaded new employee: ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}`);
            } else if (result.errors || result.duplicateError) {
              const errorMsg = result.duplicateError || Object.values(result.errors || {}).join(', ');
              errors.push(`Failed to create ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = `Error processing ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastSyncDate = new Date();

      return {
        success: errors.length === 0,
        uploadedCount: 0,
        downloadedCount,
        errors
      };
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Full sync: upload first, then download (all entity types)
   */
  async fullSync(): Promise<SyncStatus> {
    const syncStatus: SyncStatus = {
      totalLocalCustomers: 0,
      totalUnsyncedCustomers: 0,
      totalLocalEmployees: 0,
      totalUnsyncedEmployees: 0,
      customersUploaded: 0,
      customersDownloaded: 0,
      employeesUploaded: 0,
      employeesDownloaded: 0,
      categoriesUploaded: 0,
      categoriesDownloaded: 0,
      productsUploaded: 0,
      productsDownloaded: 0,
      startTime: new Date(),
      success: false,
      isUploading: false,
      isDownloading: false
    };

    try {
      // Initialize all services
      await customerService.initialize();
      await employeeService.initialize();
      await categoryService.initialize();
      await productService.initialize();
      
      // Get the initial status
      const initialStatus = await this.getSyncStatus();
      syncStatus.totalLocalCustomers = initialStatus.totalLocalCustomers;
      syncStatus.totalUnsyncedCustomers = initialStatus.totalUnsyncedCustomers;
      syncStatus.totalLocalEmployees = initialStatus.totalLocalEmployees;
      syncStatus.totalUnsyncedEmployees = initialStatus.totalUnsyncedEmployees;

      // Upload phase
      console.log('Starting full sync - Upload phase');
      syncStatus.isUploading = true;
      
      // Upload customers
      const uploadCustomersResult = await this.uploadCustomers();
      syncStatus.customersUploaded = uploadCustomersResult.uploadedCount;
      
      // Upload employees
      const uploadEmployeesResult = await this.uploadEmployees();
      syncStatus.employeesUploaded = uploadEmployeesResult.uploadedCount;
      
      // Upload categories
      const uploadCategoriesResult = await this.uploadCategories();
      syncStatus.categoriesUploaded = uploadCategoriesResult.uploadedCount;
      
      // Upload products
      const uploadProductsResult = await this.uploadProducts();
      syncStatus.productsUploaded = uploadProductsResult.uploadedCount;
      
      // Download phase
      console.log('Starting download phase');
      syncStatus.isUploading = false;
      syncStatus.isDownloading = true;
      
      // Download customers
      const downloadCustomersResult = await this.downloadCustomers();
      syncStatus.customersDownloaded = downloadCustomersResult.downloadedCount;
      
      // Download employees
      const downloadEmployeesResult = await this.downloadEmployees();
      syncStatus.employeesDownloaded = downloadEmployeesResult.downloadedCount;
      
      // Download categories
      const downloadCategoriesResult = await this.downloadCategories();
      syncStatus.categoriesDownloaded = downloadCategoriesResult.downloadedCount;
      
      // Download products
      const downloadProductsResult = await this.downloadProducts();
      syncStatus.productsDownloaded = downloadProductsResult.downloadedCount;
      
      // Mark sync as complete
      this.lastSyncDate = new Date();
      syncStatus.endTime = new Date();
      syncStatus.success = true;
      
      return syncStatus;
    } catch (error) {
      console.error('Full sync failed:', error);
      syncStatus.endTime = new Date();
      syncStatus.success = false;
      syncStatus.error = error instanceof Error ? error.message : 'Unknown error during sync';
      return syncStatus;
    } finally {
      syncStatus.isUploading = false;
      syncStatus.isDownloading = false;
    }
  }
  
  /**
   * Download products from the server
   */
  async downloadProducts(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;
    
    try {
      await productService.initialize();
      
      console.log('Starting download of products from Amplify...');

      // API call to fetch products from server would go here
      // Using 'as any' to bypass type checking issues with the client model types
      if (!client.models || !client.models.Product) {
        throw new Error('Amplify Product model not configured. Please check your Amplify setup.');
      }
      const response = await (client.models as any).Product.list();

      if (response.errors) {
        errors.push(`Failed to fetch products: ${response.errors.map((e: any) => e.message).join(', ')}`);
        return {
          success: false,
          uploadedCount: 0,
          downloadedCount: 0,
          errors
        };
      }

      // Get products from response
      const serverProducts = response.data || [];
      
      console.log(`Processing ${serverProducts.length} products from server`);

      for (const serverProduct of serverProducts) {
        try {
          // Convert server model to local model
          const productData = this.fromProductApiModel(serverProduct);

          // Check if we already have this product locally
          let localProduct = null;
          if (serverProduct.id) {
            const existingProducts = await productService.getAllProductsSorted();
            localProduct = existingProducts.find(p => p.amplifyId === serverProduct.id);
          }

          if (localProduct) {
            // Update existing product
            const result = await productService.updateProduct(localProduct.id, {
              ...productData,
              isLocalOnly: false,
              lastSyncedAt: new Date().toISOString()
            });

            if (result.product) {
              downloadedCount++;
            } else if (result.errors) {
              const errorMsg = `Error updating product from server: ${JSON.stringify(result.errors)}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          } else {
            // Create new product
            const result = await productService.createProduct({
              ...productData,
              isLocalOnly: false,
              lastSyncedAt: new Date().toISOString()
            });

            if (result.product) {
              // Mark as synced
              await productService.markAsSynced(result.product.id, serverProduct.id);
              downloadedCount++;
            } else if (result.errors) {
              const errorMsg = `Error creating product from server: ${JSON.stringify(result.errors)}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process server product ${serverProduct.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: true,
        uploadedCount: 0,
        downloadedCount,
        errors
      };
    } catch (error) {
      console.error('Error during product download:', error);
      return {
        success: false,
        downloadedCount: 0,
        uploadedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error during product download']
      };
    } finally {
      this.isDownloading = false;
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
