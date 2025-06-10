import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { customerService } from './customerService';
import { CustomerDocument } from '../schemas/customer';
import { employeeService } from './employeeService';
import { EmployeeDocument } from '../schemas/employee';
import { categoryService } from './categoryService';
import { CategoryDocument } from '../schemas/category';
import { productService } from './productService';
import { ProductDocument } from '../schemas/product';
import { businessService } from './businessService';
import { BusinessDocument } from '../schemas/business';

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
  totalLocalBusinesses: number;
  totalUnsyncedBusinesses: number;
  customersUploaded: number;
  customersDownloaded: number;
  employeesUploaded: number;
  employeesDownloaded: number;
  categoriesUploaded: number;
  categoriesDownloaded: number;
  productsUploaded: number;
  productsDownloaded: number;
  businessesUploaded: number;
  businessesDownloaded: number;
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
  private async convertProductToAmplifyFormat(product: ProductDocument): Promise<any> {
    // Using type assertion to bypass type checking issues
    const doc = product as any;
    
    // Find the Amplify category ID for this product's category
    let amplifyCategoryId = doc.categoryId; // Default to local ID
    
    try {
      await categoryService.initialize();
      const category = await categoryService.getCategoryById(doc.categoryId);
      if (category && category.amplifyId) {
        amplifyCategoryId = category.amplifyId;
        console.log(`[PRODUCT UPLOAD] Mapped local category ${doc.categoryId} to Amplify category ${amplifyCategoryId} for product ${doc.name}`);
      } else {
        console.warn(`[PRODUCT UPLOAD] No Amplify ID found for category ${doc.categoryId} for product ${doc.name}`);
      }
    } catch (error) {
      console.warn(`[PRODUCT UPLOAD] Error mapping category for product ${doc.name}:`, error);
    }
    
    return {
      name: doc.name,
      description: doc.description,
      sku: doc.sku,
      price: doc.price,
      cost: doc.cost,
      categoryId: amplifyCategoryId,
      barcode: doc.barcode,
      quantity: doc.quantity,
      isActive: doc.isActive,
      imageName: doc.imageName, // Include image reference for static assets
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
      imageName: amplifyProduct.imageName, // Include image reference for static assets
      amplifyId: amplifyProduct.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };
  }

  /**
   * Convert business from local format to Amplify format
   */
  private async convertBusinessToAmplifyFormat(business: BusinessDocument): Promise<any> {
    const doc = business as any;
    
    // Get current user email
    let userEmail = '';
    try {
      const user = await getCurrentUser();
      userEmail = user.signInDetails?.loginId || user.username || '';
      console.log('Got user email for business sync:', userEmail);
    } catch (error) {
      console.error('Could not get current user email:', error);
      userEmail = 'noemail@example.com'; // Fallback
      console.log('Using fallback email:', userEmail);
    }
    
    const amplifyData: any = {
      businessName: doc.name, // Map 'name' to 'businessName' for Amplify
      phone: doc.phone || '', // Required field in Amplify
      email: userEmail, // Use current user's email
    };

    // Include optional fields only if they have values
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
    if (doc.website && doc.website.trim()) {
      amplifyData.website = doc.website;
    }

    return amplifyData;
  }

  /**
   * Convert business from Amplify format to local format
   */
  private convertBusinessToLocalFormat(amplifyBusiness: any): any {
    return {
      name: amplifyBusiness.businessName, // Map 'businessName' to 'name' for local
      address: amplifyBusiness.address || '',
      city: amplifyBusiness.city || '',
      state: amplifyBusiness.state || '',
      zipCode: amplifyBusiness.zipCode || '',
      phone: amplifyBusiness.phone || '',
      email: amplifyBusiness.email || '',
      taxId: '', // Not available in Amplify schema
      website: amplifyBusiness.website || '',
      // Don't set amplifyId and isLocalOnly here - let markBusinessSynced handle it
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
    await businessService.initialize();
    
    const totalLocalCustomers = await customerService.getCustomersCount();
    const unsyncedCustomers = await customerService.getUnsyncedCustomers();
    const totalLocalEmployees = await employeeService.getEmployeesCount();
    const unsyncedEmployees = await employeeService.getUnsyncedEmployees();
    const allBusinesses = await businessService.getAllBusinesses();
    const totalLocalBusinesses = allBusinesses.length;
    const unsyncedBusinesses = await businessService.getUnsyncedBusinesses();
    
    console.log(`[SYNC STATUS] Businesses - Total: ${totalLocalBusinesses}, Unsynced: ${unsyncedBusinesses.length}`);
    allBusinesses.forEach(business => {
      console.log(`[SYNC STATUS] Business: ${business.name}, isLocalOnly: ${business.isLocalOnly}, synced: ${!business.isLocalOnly}`);
    });
    
    return {
      isUploading: this.isUploading,
      isDownloading: this.isDownloading,
      lastSyncDate: this.lastSyncDate,
      totalLocalCustomers,
      totalUnsyncedCustomers: unsyncedCustomers.length,
      totalLocalEmployees,
      totalUnsyncedEmployees: unsyncedEmployees.length,
      totalLocalBusinesses,
      totalUnsyncedBusinesses: unsyncedBusinesses.length,
      customersUploaded: 0,
      customersDownloaded: 0,
      employeesUploaded: 0,
      employeesDownloaded: 0,
      categoriesUploaded: 0,
      categoriesDownloaded: 0,
      productsUploaded: 0,
      productsDownloaded: 0,
      businessesUploaded: 0,
      businessesDownloaded: 0,
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
          const amplifyProduct = await this.convertProductToAmplifyFormat(product);
          
          // Create product in Amplify
          // Using 'as any' to bypass type checking issues with the client model types
          const response = await (client.models as any).Product.create(amplifyProduct);
          
          if (response.data) {
            // Mark as synced in local database
            await productService.markAsSynced(product.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded product: ${product.name} (imageName: ${product.imageName || 'none'}, categoryId: ${amplifyProduct.categoryId})`);
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
   * Upload all local businesses to Amplify
   */
  async uploadBusinesses(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await businessService.initialize();
      
      // Debug: Get all businesses first to see their sync status
      const allBusinesses = await businessService.getAllBusinesses();
      console.log(`[BUSINESS UPLOAD] Total businesses in database: ${allBusinesses.length}`);
      allBusinesses.forEach(business => {
        console.log(`[BUSINESS UPLOAD] Business: ${business.name}, isLocalOnly: ${business.isLocalOnly}, amplifyId: ${business.amplifyId || 'NONE'}, isDeleted: ${business.isDeleted || false}`);
      });
      
      const unsyncedBusinesses = await businessService.getUnsyncedBusinesses();
      console.log(`[BUSINESS UPLOAD] Starting upload of ${unsyncedBusinesses.length} unsynced businesses...`);
      
      // Debug: Log all businesses to be synced
      unsyncedBusinesses.forEach(business => {
        console.log(`[BUSINESS UPLOAD] Business to sync: ${business.name}, phone: ${business.phone || 'MISSING'}, email: ${business.email || 'MISSING'}, isLocalOnly: ${business.isLocalOnly}`);
      });

      if (!client.models || !client.models.Business) {
        throw new Error('Amplify Business model not configured. Please check your Amplify setup.');
      }

      for (const business of unsyncedBusinesses) {
        try {
          const amplifyData = await this.convertBusinessToAmplifyFormat(business);
          
          // Skip if required fields are missing
          if (!amplifyData.phone || !amplifyData.email) {
            console.log(`Skipping business ${business.name}: Missing required phone (${amplifyData.phone || 'MISSING'}) or email (${amplifyData.email || 'MISSING'}) for sync`);
            errors.push(`Skipping business ${business.name}: Missing required phone or email for sync`);
            continue;
          }
          
          console.log(`[BUSINESS UPLOAD] Uploading business ${business.name} with data:`, amplifyData);
          
          const response = await (client.models as any).Business.create(amplifyData);
          
          if (response.errors) {
            errors.push(`Failed to upload business ${business.name}: ${response.errors.map((e: any) => e.message).join(', ')}`);
            continue;
          }

          if (response.data) {
            // Mark as synced in local database
            await businessService.markBusinessSynced(business.id, response.data.id);
            uploadedCount++;
            console.log(`[BUSINESS UPLOAD] ✓ Uploaded business: ${business.name} (ID: ${response.data.id})`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to upload business ${business.name}: ${errorMessage}`);
          console.error(`[BUSINESS UPLOAD] Error uploading business ${business.name}:`, error);
        }
      }

      console.log(`[BUSINESS UPLOAD] Upload complete. ${uploadedCount} businesses uploaded successfully.`);
      
      if (uploadedCount === 0 && unsyncedBusinesses.length === 0 && allBusinesses.length > 0) {
        console.log(`[BUSINESS UPLOAD] ℹ️  All ${allBusinesses.length} businesses are already synced with the cloud.`);
        console.log(`[BUSINESS UPLOAD] ℹ️  Use the 'Force Resync' button on individual businesses if you need to re-upload them.`);
      }
      
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
      await productService.initialize();
      
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
      const categoryIdMapping: { [amplifyId: string]: string } = {}; // Map Amplify ID to local ID

      // First pass: Handle categories
      for (const amplifyCategory of amplifyCategories) {
        try {
          // Check if category already exists locally by amplifyId
          const existingCategories = await categoryService.getAllCategories();
          const existingCategory = existingCategories.find(c => c.amplifyId === amplifyCategory.id);

          if (existingCategory) {
            // Update existing category if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyCategory.updatedAt);
            const localUpdatedAt = new Date(existingCategory.updatedAt);
            
            // Store the mapping regardless of update
            categoryIdMapping[amplifyCategory.id] = existingCategory.id;
            
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
              categoryIdMapping[amplifyCategory.id] = result.category.id;
              downloadedCount++;
              console.log(`Downloaded new category: ${amplifyCategory.name} with local ID: ${result.category.id}`);
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

      // Second pass: Fix product category relationships
      console.log('Fixing product category relationships after category sync...');
      const allProducts = await productService.getAllProducts();
      
      for (const product of allProducts) {
        try {
          // If this product has an amplifyId, we need to find the correct category mapping
          if (product.amplifyId && product.categoryId) {
            // Find the amplify category ID that this product should reference
            const amplifyResponse = await (client.models as any).Product.get({ id: product.amplifyId });
            
            if (amplifyResponse.data && amplifyResponse.data.categoryId) {
              const amplifyCategoryId = amplifyResponse.data.categoryId;
              const correctLocalCategoryId = categoryIdMapping[amplifyCategoryId];
              
              if (correctLocalCategoryId && correctLocalCategoryId !== product.categoryId) {
                console.log(`Fixing product ${product.name}: updating categoryId from ${product.categoryId} to ${correctLocalCategoryId}`);
                
                // Update the product with correct category ID
                await productService.updateProduct(product.id, {
                  name: product.name,
                  description: product.description || '',
                  price: product.price,
                  categoryId: correctLocalCategoryId,
                  imageName: product.imageName || '',
                  discount: product.discount || 0,
                  additionalPrice: product.additionalPrice || 0,
                  notes: product.notes || ''
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Could not fix category relationship for product ${product.name}:`, error);
          // Don't add to errors array as this is a best-effort fix
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
      totalLocalBusinesses: 0,
      totalUnsyncedBusinesses: 0,
      customersUploaded: 0,
      customersDownloaded: 0,
      employeesUploaded: 0,
      employeesDownloaded: 0,
      categoriesUploaded: 0,
      categoriesDownloaded: 0,
      productsUploaded: 0,
      productsDownloaded: 0,
      businessesUploaded: 0,
      businessesDownloaded: 0,
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
      await businessService.initialize();
      
      // Get the initial status
      const initialStatus = await this.getSyncStatus();
      syncStatus.totalLocalCustomers = initialStatus.totalLocalCustomers;
      syncStatus.totalUnsyncedCustomers = initialStatus.totalUnsyncedCustomers;
      syncStatus.totalLocalEmployees = initialStatus.totalLocalEmployees;
      syncStatus.totalUnsyncedEmployees = initialStatus.totalUnsyncedEmployees;
      syncStatus.totalLocalBusinesses = initialStatus.totalLocalBusinesses;
      syncStatus.totalUnsyncedBusinesses = initialStatus.totalUnsyncedBusinesses;

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
      
      // Upload businesses
      const uploadBusinessesResult = await this.uploadBusinesses();
      syncStatus.businessesUploaded = uploadBusinessesResult.uploadedCount;
      
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
      
      // Download businesses
      const downloadBusinessesResult = await this.downloadBusinesses();
      syncStatus.businessesDownloaded = downloadBusinessesResult.downloadedCount;
      
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
   * Download businesses from Amplify and sync to local database
   */
  async downloadBusinesses(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;

    try {
      await businessService.initialize();
      
      console.log('Starting download of businesses from Amplify...');

      if (!client.models || !client.models.Business) {
        throw new Error('Amplify Business model not configured. Please check your Amplify setup.');
      }

      // Get current user's email
      let userEmail = '';
      try {
        const user = await getCurrentUser();
        userEmail = user.signInDetails?.loginId || user.username || '';
        console.log('Downloading businesses for user:', userEmail);
      } catch (error) {
        console.error('Error getting current user:', error);
        throw new Error('Failed to get current user information');
      }

      if (!userEmail) {
        throw new Error('User email is required to download businesses');
      }

      // Get businesses filtered by user's email
      const response = await (client.models as any).Business.list({
        filter: {
          email: { eq: userEmail }
        }
      });
      const amplifyBusinesses = response.data;
      
      console.log(`[BUSINESS DOWNLOAD] Found ${amplifyBusinesses.length} businesses in Amplify for user ${userEmail}`);

      // Convert and save each business
      for (const amplifyBusiness of amplifyBusinesses) {
        try {
          const localBusiness = this.convertBusinessToLocalFormat(amplifyBusiness);
          
          // Check if business already exists locally
          const existingBusiness = await businessService.getBusinessByAmplifyId(amplifyBusiness.id);
          
          if (existingBusiness) {
            // Update existing business and mark as synced
            await businessService.updateBusiness(existingBusiness.id, localBusiness);
            await businessService.markBusinessSynced(existingBusiness.id, amplifyBusiness.id);
          } else {
            // Create new business
            const createResult = await businessService.createBusiness(localBusiness);
            if (createResult.business) {
              // Mark as synced since it came from Amplify
              await businessService.markBusinessSynced(createResult.business.id, amplifyBusiness.id);
            }
          }
          
          downloadedCount++;
          console.log(`[BUSINESS DOWNLOAD] ✓ Synced business: ${amplifyBusiness.businessName}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to sync business ${amplifyBusiness.businessName || amplifyBusiness.id}: ${errorMessage}`);
          console.error(`[BUSINESS DOWNLOAD] Error syncing business:`, error);
        }
      }

      console.log(`[BUSINESS DOWNLOAD] Download complete. ${downloadedCount} businesses synced successfully.`);
      
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
      await categoryService.initialize();
      
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
      
      // Build category mapping from Amplify ID to local ID
      const categories = await categoryService.getAllCategories();
      const categoryIdMapping: { [amplifyId: string]: string } = {};
      categories.forEach(category => {
        if (category.amplifyId) {
          categoryIdMapping[category.amplifyId] = category.id;
        }
      });
      
      console.log(`Processing ${serverProducts.length} products from server with ${Object.keys(categoryIdMapping).length} category mappings`);

      for (const serverProduct of serverProducts) {
        try {
          // Convert server model to local model
          const productData = this.fromProductApiModel(serverProduct);
          
          // Map the category ID from Amplify to local if available
          if (serverProduct.categoryId && categoryIdMapping[serverProduct.categoryId]) {
            productData.categoryId = categoryIdMapping[serverProduct.categoryId];
            console.log(`[PRODUCT DOWNLOAD] Mapped category ID ${serverProduct.categoryId} to local ID ${productData.categoryId} for product ${serverProduct.name}`);
          } else if (serverProduct.categoryId) {
            console.warn(`[PRODUCT DOWNLOAD] No local category found for Amplify category ID ${serverProduct.categoryId} for product ${serverProduct.name}`);
            // Try to find category by name as fallback
            const categoryName = await this.getCategoryNameFromAmplify(serverProduct.categoryId);
            if (categoryName) {
              const localCategory = await categoryService.findByName(categoryName);
              if (localCategory) {
                productData.categoryId = localCategory.id;
                console.log(`[PRODUCT DOWNLOAD] Found category by name: ${categoryName} -> ${localCategory.id}`);
              }
            }
          }
          
          console.log(`[PRODUCT DOWNLOAD] Processing product: ${serverProduct.name} (imageName: ${serverProduct.imageName || 'none'}, categoryId: ${productData.categoryId})`);

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

  /**
   * Helper method to get category name from Amplify by ID
   */
  private async getCategoryNameFromAmplify(categoryId: string): Promise<string | null> {
    try {
      if (!client.models || !client.models.Category) {
        return null;
      }
      const response = await (client.models as any).Category.get({ id: categoryId });
      return response.data?.name || null;
    } catch (error) {
      console.warn(`Could not fetch category ${categoryId} from Amplify:`, error);
      return null;
    }
  }

  /**
   * Fix category relationships for all products in the local database
   * This should be called after category sync to ensure product-category links are correct
   */
  async fixProductCategoryRelationships(): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixedCount = 0;

    try {
      await productService.initialize();
      await categoryService.initialize();

      console.log('Fixing product-category relationships...');
      
      // Build category mapping from Amplify ID to local ID
      const categories = await categoryService.getAllCategories();
      const categoryIdMapping: { [amplifyId: string]: string } = {};
      categories.forEach(category => {
        if (category.amplifyId) {
          categoryIdMapping[category.amplifyId] = category.id;
        }
      });

      // Get all products and check their category relationships
      const allProducts = await productService.getAllProducts();
      
      for (const product of allProducts) {
        try {
          // If this product has an amplifyId and a categoryId, verify the relationship is correct
          if (product.amplifyId && product.categoryId) {
            // Fetch the product from Amplify to get the correct category ID
            const amplifyResponse = await (client.models as any).Product.get({ id: product.amplifyId });
            
            if (amplifyResponse.data && amplifyResponse.data.categoryId) {
              const amplifyCategoryId = amplifyResponse.data.categoryId;
              const correctLocalCategoryId = categoryIdMapping[amplifyCategoryId];
              
              if (correctLocalCategoryId && correctLocalCategoryId !== product.categoryId) {
                console.log(`Fixing product ${product.name}: updating categoryId from ${product.categoryId} to ${correctLocalCategoryId}`);
                
                // Update the product with correct category ID
                const result = await productService.updateProduct(product.id, {
                  name: product.name,
                  description: product.description || '',
                  price: product.price,
                  categoryId: correctLocalCategoryId,
                  imageName: product.imageName || '',
                  discount: product.discount || 0,
                  additionalPrice: product.additionalPrice || 0,
                  notes: product.notes || ''
                });
                
                if (result.product) {
                  fixedCount++;
                } else if (result.errors) {
                  errors.push(`Failed to fix category for product ${product.name}: ${JSON.stringify(result.errors)}`);
                }
              }
            }
          }
        } catch (error) {
          const errorMsg = `Error fixing category relationship for product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.warn(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Fixed ${fixedCount} product-category relationships`);
      return { fixed: fixedCount, errors };
    } catch (error) {
      const errorMsg = `Error during category relationship fix: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { fixed: fixedCount, errors: [...errors, errorMsg] };
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
