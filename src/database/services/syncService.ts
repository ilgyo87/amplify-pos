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
import { OrderService } from './orderService';
import { SerializableCustomer } from '../../navigation/types';
import { BusinessDocument } from '../schemas/business';

const orderService = new OrderService();

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
  totalLocalOrders: number;
  totalUnsyncedOrders: number;
  totalLocalCategories: number;
  totalUnsyncedCategories: number;
  totalLocalProducts: number;
  totalUnsyncedProducts: number;
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
  ordersUploaded: number;
  ordersDownloaded: number;
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
   * Convert order from local format to Amplify format
   */
  private async convertOrderToAmplifyFormat(order: any): Promise<any> {
    // Map local business ID to Amplify business ID
    let amplifyBusinessId = order.businessId;
    if (!amplifyBusinessId || amplifyBusinessId.trim() === '') {
      try {
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        if (businesses.length > 0) {
          amplifyBusinessId = businesses[0].amplifyId || businesses[0].id; // Prefer Amplify ID
          console.log(`[ORDER UPLOAD] Using business ID ${amplifyBusinessId} for order ${order.orderNumber}`);
        } else {
          throw new Error('No businesses found. Please create a business first.');
        }
      } catch (error) {
        console.error('Error getting business for order:', error);
        throw new Error('Failed to get business ID for order upload');
      }
    } else {
      // Map local business ID to Amplify business ID
      try {
        await businessService.initialize();
        const business = await businessService.getBusinessById(order.businessId);
        if (business && business.amplifyId) {
          amplifyBusinessId = business.amplifyId;
          console.log(`[ORDER UPLOAD] Mapped local business ${order.businessId} to Amplify business ${amplifyBusinessId} for order ${order.orderNumber}`);
        } else {
          console.warn(`[ORDER UPLOAD] No Amplify ID found for business ${order.businessId} for order ${order.orderNumber}`);
        }
      } catch (error) {
        console.warn(`[ORDER UPLOAD] Error mapping business for order ${order.orderNumber}:`, error);
      }
    }

    // Map local customer ID to Amplify customer ID
    let amplifyCustomerId = order.customerId;
    if (order.customerId) {
      try {
        await customerService.initialize();
        const customer = await customerService.getCustomerById(order.customerId);
        if (customer && customer.amplifyId) {
          amplifyCustomerId = customer.amplifyId;
          console.log(`[ORDER UPLOAD] Mapped local customer ${order.customerId} to Amplify customer ${amplifyCustomerId} for order ${order.orderNumber}`);
        } else {
          console.warn(`[ORDER UPLOAD] No Amplify ID found for customer ${order.customerId} for order ${order.orderNumber}`);
        }
      } catch (error) {
        console.warn(`[ORDER UPLOAD] Error mapping customer for order ${order.orderNumber}:`, error);
      }
    }

    // Map local employee ID to Amplify employee ID
    let amplifyEmployeeId = order.employeeId || '';
    if (order.employeeId) {
      try {
        await employeeService.initialize();
        const employee = await employeeService.getEmployeeById(order.employeeId);
        if (employee && employee.amplifyId) {
          amplifyEmployeeId = employee.amplifyId;
          console.log(`[ORDER UPLOAD] Mapped local employee ${order.employeeId} to Amplify employee ${amplifyEmployeeId} for order ${order.orderNumber}`);
        } else {
          console.warn(`[ORDER UPLOAD] No Amplify ID found for employee ${order.employeeId} for order ${order.orderNumber}`);
        }
      } catch (error) {
        console.warn(`[ORDER UPLOAD] Error mapping employee for order ${order.orderNumber}:`, error);
      }
    }

    const amplifyOrderData: any = {
      businessId: amplifyBusinessId,
      customerId: amplifyCustomerId,
      employeeId: amplifyEmployeeId,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status || 'completed'
    };

    // Only include optional fields if they have valid values
    if (order.orderNumber && order.orderNumber.trim()) {
      amplifyOrderData.orderNumber = order.orderNumber;
    }
    if (order.customerName && order.customerName.trim()) {
      amplifyOrderData.customerName = order.customerName;
    }
    if (order.customerPhone && order.customerPhone.trim()) {
      amplifyOrderData.customerPhone = order.customerPhone;
    }
    if (order.employeeName && order.employeeName.trim()) {
      amplifyOrderData.employeeName = order.employeeName;
    }
    if (typeof order.subtotal === 'number') {
      amplifyOrderData.subtotal = order.subtotal;
    }
    if (typeof order.tax === 'number') {
      amplifyOrderData.tax = order.tax;
    }
    if (order.paymentInfo) {
      amplifyOrderData.paymentInfo = JSON.stringify(order.paymentInfo);
    }
    if (order.selectedDate && order.selectedDate.trim()) {
      amplifyOrderData.selectedDate = order.selectedDate;
    }
    if (order.statusHistory && order.statusHistory.length > 0) {
      amplifyOrderData.statusHistory = JSON.stringify(order.statusHistory);
    }
    if (order.notes && order.notes.trim()) {
      amplifyOrderData.notes = order.notes;
    }
    if (order.barcodeData && order.barcodeData.trim()) {
      amplifyOrderData.barcodeData = order.barcodeData;
    }
    if (order.rackNumber && order.rackNumber.trim()) {
      amplifyOrderData.rackNumber = order.rackNumber;
    }

    console.log(`[ORDER UPLOAD] Order ${order.orderNumber} data for Amplify:`, JSON.stringify(amplifyOrderData, null, 2));
    return amplifyOrderData;
  }



  /**
   * Convert customer from local format to Amplify format
   */
  private async convertCustomerToAmplifyFormat(customer: CustomerDocument): Promise<any> {
    // Using type assertion to bypass type checking issues
    const doc = customer as any;
    const amplifyData: any = {
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
    };

    // Only include optional fields if they have valid values
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
    if (doc.email && doc.email.trim()) {
      amplifyData.email = doc.email;
    }
    
    // Map local business ID to AWS business ID
    if (doc.businessId && doc.businessId.trim()) {
      try {
        await businessService.initialize();
        const business = await businessService.getBusinessById(doc.businessId);
        if (business && business.amplifyId) {
          amplifyData.businessId = business.amplifyId;
          console.log(`[CUSTOMER UPLOAD] Mapped local business ${doc.businessId} to AWS business ${business.amplifyId} for customer ${doc.firstName} ${doc.lastName}`);
        } else {
          console.warn(`[CUSTOMER UPLOAD] No AWS ID found for business ${doc.businessId} for customer ${doc.firstName} ${doc.lastName}`);
          // Don't include businessId if we can't map it properly
        }
      } catch (error) {
        console.warn(`[CUSTOMER UPLOAD] Error mapping business for customer ${doc.firstName} ${doc.lastName}:`, error);
        // Don't include businessId if mapping fails
      }
    }
    
    if (doc.cognitoId && doc.cognitoId.trim()) {
      amplifyData.cognitoId = doc.cognitoId;
    }
    if (typeof doc.emailNotifications === 'boolean') {
      amplifyData.emailNotifications = doc.emailNotifications;
    }
    if (typeof doc.textNotifications === 'boolean') {
      amplifyData.textNotifications = doc.textNotifications;
    }
    if (doc.coordinates) {
      amplifyData.coordinates = doc.coordinates;
    }

    // Note: 'notes' and 'joinDate' fields are not supported in Amplify Customer schema
    // These are local-only fields for enhanced customer management

    return amplifyData;
  }

  /**
   * Convert customer from Amplify format to local format
   */
  private async convertCustomerToLocalFormat(amplifyCustomer: any): Promise<any> {
    const localData: any = {
      id: amplifyCustomer.id, // Use Amplify ID as primary key for consistency
      firstName: amplifyCustomer.firstName,
      lastName: amplifyCustomer.lastName,
      phone: amplifyCustomer.phone,
      amplifyId: amplifyCustomer.id, // Keep for backwards compatibility
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      createdAt: amplifyCustomer.createdAt || new Date().toISOString(),
      updatedAt: amplifyCustomer.updatedAt || new Date().toISOString()
    };

    // Include optional fields if they exist in Amplify data
    if (amplifyCustomer.address) {
      localData.address = amplifyCustomer.address;
    }
    if (amplifyCustomer.city) {
      localData.city = amplifyCustomer.city;
    }
    if (amplifyCustomer.state) {
      localData.state = amplifyCustomer.state;
    }
    if (amplifyCustomer.zipCode) {
      localData.zipCode = amplifyCustomer.zipCode;
    }
    if (amplifyCustomer.email) {
      localData.email = amplifyCustomer.email;
    }
    
    // Map AWS business ID to local business ID
    if (amplifyCustomer.businessId) {
      try {
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        const business = businesses.find(b => b.amplifyId === amplifyCustomer.businessId);
        if (business) {
          localData.businessId = business.id;
          console.log(`[CUSTOMER DOWNLOAD] Mapped AWS business ${amplifyCustomer.businessId} to local business ${business.id} for customer ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}`);
        } else {
          console.warn(`[CUSTOMER DOWNLOAD] No local business found for AWS business ${amplifyCustomer.businessId} for customer ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}`);
          localData.businessId = amplifyCustomer.businessId; // Keep AWS ID as fallback
        }
      } catch (error) {
        console.warn(`[CUSTOMER DOWNLOAD] Error mapping business for customer ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}:`, error);
        localData.businessId = amplifyCustomer.businessId; // Keep AWS ID as fallback
      }
    }
    
    if (amplifyCustomer.cognitoId) {
      localData.cognitoId = amplifyCustomer.cognitoId;
    }
    if (typeof amplifyCustomer.emailNotifications === 'boolean') {
      localData.emailNotifications = amplifyCustomer.emailNotifications;
    }
    if (typeof amplifyCustomer.textNotifications === 'boolean') {
      localData.textNotifications = amplifyCustomer.textNotifications;
    }
    if (amplifyCustomer.coordinates) {
      localData.coordinates = amplifyCustomer.coordinates;
    }

    // Set default values for local-only fields that don't exist in Amplify
    localData.notes = ''; // Local-only field for customer notes
    localData.joinDate = new Date().toISOString(); // Use current date as join date

    return localData;
  }

  /**
   * Convert employee from local format to Amplify format
   */
  private async convertEmployeeToAmplifyFormat(employee: EmployeeDocument): Promise<any> {
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
    
    // Map local business ID to AWS business ID
    if (doc.businessId && doc.businessId.trim()) {
      try {
        await businessService.initialize();
        const business = await businessService.getBusinessById(doc.businessId);
        if (business && business.amplifyId) {
          amplifyData.businessId = business.amplifyId;
          console.log(`[EMPLOYEE UPLOAD] Mapped local business ${doc.businessId} to AWS business ${business.amplifyId} for employee ${doc.firstName} ${doc.lastName}`);
        } else {
          console.warn(`[EMPLOYEE UPLOAD] No AWS ID found for business ${doc.businessId} for employee ${doc.firstName} ${doc.lastName}`);
          // Don't include businessId if we can't map it properly
        }
      } catch (error) {
        console.warn(`[EMPLOYEE UPLOAD] Error mapping business for employee ${doc.firstName} ${doc.lastName}:`, error);
        // Don't include businessId if mapping fails
      }
    }

    return amplifyData;
  }

  /**
   * Convert employee from Amplify format to local format
   */
  private async convertEmployeeToLocalFormat(amplifyEmployee: any): Promise<any> {
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
    
    // Map AWS business ID to local business ID
    if (amplifyEmployee.businessId) {
      try {
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        const business = businesses.find(b => b.amplifyId === amplifyEmployee.businessId);
        if (business) {
          localData.businessId = business.id;
          console.log(`[EMPLOYEE DOWNLOAD] Mapped AWS business ${amplifyEmployee.businessId} to local business ${business.id} for employee ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}`);
        } else {
          console.warn(`[EMPLOYEE DOWNLOAD] No local business found for AWS business ${amplifyEmployee.businessId} for employee ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}`);
          localData.businessId = amplifyEmployee.businessId; // Keep AWS ID as fallback
        }
      } catch (error) {
        console.warn(`[EMPLOYEE DOWNLOAD] Error mapping business for employee ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}:`, error);
        localData.businessId = amplifyEmployee.businessId; // Keep AWS ID as fallback
      }
    }

    return localData;
  }

  /**
   * Convert category from local format to Amplify format
   */
  private async convertCategoryToAmplifyFormat(category: CategoryDocument): Promise<any> {
    // Using type assertion to bypass type checking issues
    const doc = category as any;
    const amplifyData: any = {
      name: doc.name,
      description: doc.description,
      color: doc.color,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
    };

    // Map local business ID to AWS business ID
    if (doc.businessId && doc.businessId.trim()) {
      try {
        await businessService.initialize();
        const business = await businessService.getBusinessById(doc.businessId);
        if (business && business.amplifyId) {
          amplifyData.businessId = business.amplifyId;
          console.log(`[CATEGORY UPLOAD] Mapped local business ${doc.businessId} to AWS business ${business.amplifyId} for category ${doc.name}`);
        } else {
          console.warn(`[CATEGORY UPLOAD] No AWS ID found for business ${doc.businessId} for category ${doc.name}`);
          // Don't include businessId if we can't map it properly
        }
      } catch (error) {
        console.warn(`[CATEGORY UPLOAD] Error mapping business for category ${doc.name}:`, error);
        // Don't include businessId if mapping fails
      }
    }

    return amplifyData;
  }

  /**
   * Convert category from Amplify format to local format
   */
  private async convertCategoryToLocalFormat(amplifyCategory: any): Promise<any> {
    const localData: any = {
      name: amplifyCategory.name,
      description: amplifyCategory.description,
      color: amplifyCategory.color,
      displayOrder: amplifyCategory.displayOrder,
      isActive: amplifyCategory.isActive,
      amplifyId: amplifyCategory.id,
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString()
    };

    // Map AWS business ID to local business ID
    if (amplifyCategory.businessId) {
      try {
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        const business = businesses.find(b => b.amplifyId === amplifyCategory.businessId);
        if (business) {
          localData.businessId = business.id;
          console.log(`[CATEGORY DOWNLOAD] Mapped AWS business ${amplifyCategory.businessId} to local business ${business.id} for category ${amplifyCategory.name}`);
        } else {
          console.warn(`[CATEGORY DOWNLOAD] No local business found for AWS business ${amplifyCategory.businessId} for category ${amplifyCategory.name}`);
          localData.businessId = amplifyCategory.businessId; // Keep AWS ID as fallback
        }
      } catch (error) {
        console.warn(`[CATEGORY DOWNLOAD] Error mapping business for category ${amplifyCategory.name}:`, error);
        localData.businessId = amplifyCategory.businessId; // Keep AWS ID as fallback
      }
    }

    return localData;
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
    
    const amplifyData: any = {
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

    // Map local business ID to AWS business ID
    if (doc.businessId && doc.businessId.trim()) {
      try {
        await businessService.initialize();
        const business = await businessService.getBusinessById(doc.businessId);
        if (business && business.amplifyId) {
          amplifyData.businessId = business.amplifyId;
          console.log(`[PRODUCT UPLOAD] Mapped local business ${doc.businessId} to AWS business ${business.amplifyId} for product ${doc.name}`);
        } else {
          console.warn(`[PRODUCT UPLOAD] No AWS ID found for business ${doc.businessId} for product ${doc.name}`);
          // Don't include businessId if we can't map it properly
        }
      } catch (error) {
        console.warn(`[PRODUCT UPLOAD] Error mapping business for product ${doc.name}:`, error);
        // Don't include businessId if mapping fails
      }
    }

    return amplifyData;
  }

  /**
   * Convert product from Amplify format to local format
   */
  private async fromProductApiModel(amplifyProduct: any): Promise<any> {
    // Map Amplify category ID back to local category ID
    let localCategoryId = amplifyProduct.categoryId; // Default to Amplify ID
    
    if (amplifyProduct.categoryId) {
      try {
        await categoryService.initialize();
        const categories = await categoryService.getAllCategories();
        const category = categories.find(cat => cat.amplifyId === amplifyProduct.categoryId);
        if (category) {
          localCategoryId = category.id;
          console.log(`[PRODUCT DOWNLOAD] Mapped Amplify category ${amplifyProduct.categoryId} to local category ${localCategoryId} for product ${amplifyProduct.name}`);
        } else {
          console.warn(`[PRODUCT DOWNLOAD] No local category found for Amplify category ${amplifyProduct.categoryId} for product ${amplifyProduct.name}`);
        }
      } catch (error) {
        console.warn(`[PRODUCT DOWNLOAD] Error mapping category for product ${amplifyProduct.name}:`, error);
      }
    }
    
    // Return product document compatible with RxDB/React Native
    // (avoiding date-time format per memory)
    return {
      name: amplifyProduct.name,
      description: amplifyProduct.description,
      sku: amplifyProduct.sku,
      price: amplifyProduct.price,
      cost: amplifyProduct.cost,
      categoryId: localCategoryId, // Use mapped local category ID
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
      id: amplifyBusiness.id,
      name: amplifyBusiness.businessName, // Fix: Use businessName from Amplify schema
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
   * Convert order from Amplify format to local format
   */
  private async convertOrderToLocalFormat(amplifyOrder: any, orderItems: any[] = []): Promise<any> {
    // Group OrderItems by name and options to combine quantities
    const itemGroups = new Map<string, any>();
    
    orderItems.forEach(item => {
      const starch = item.starch || 'none';
      const pressOnly = item.pressOnly || false;
      const notes = Array.isArray(item.notes) ? item.notes.join(', ') : (item.notes || '');
      
      // Create a unique key based on name and options
      const groupKey = `${item.name}_${starch}_${pressOnly}_${notes}`;
      
      if (itemGroups.has(groupKey)) {
        // Increment quantity for existing group
        itemGroups.get(groupKey).quantity += 1;
      } else {
        // Create new group with all required OrderItem fields
        itemGroups.set(groupKey, {
          id: item.id || '',
          name: item.name || '',
          description: item.description || '',
          price: item.price || 0,
          categoryId: item.category || '',
          businessId: item.businessId || amplifyOrder.businessId || '',
          imageName: undefined,
          discount: item.discount || 0,
          additionalPrice: 0,
          notes: item.description || '',
          sku: undefined,
          cost: undefined,
          barcode: undefined,
          isActive: true,
          isLocalOnly: false,
          isDeleted: false,
          lastSyncedAt: new Date().toISOString(),
          amplifyId: item.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          quantity: 1,
          options: {
            starch: starch,
            pressOnly: pressOnly,
            notes: notes
          },
          itemKey: groupKey
        });
      }
    });
    
    // Convert map to array
    const localItems = Array.from(itemGroups.values());

    // Map Amplify business ID back to local business ID
    let localBusinessId = amplifyOrder.businessId; // Default to Amplify ID
    if (amplifyOrder.businessId) {
      try {
        await businessService.initialize();
        const businesses = await businessService.getAllBusinesses();
        
        // Try to find by amplifyId first, then by direct ID match
        const business = businesses.find(biz => biz.amplifyId === amplifyOrder.businessId) ||
                        businesses.find(biz => biz.id === amplifyOrder.businessId);
        
        if (business) {
          localBusinessId = business.id;
          console.log(`[ORDER DOWNLOAD] Mapped Amplify business ${amplifyOrder.businessId} to local business ${localBusinessId} for order ${amplifyOrder.id}`);
        } else {
          console.warn(`[ORDER DOWNLOAD] No local business found for Amplify business ${amplifyOrder.businessId} for order ${amplifyOrder.id}`);
        }
      } catch (error) {
        console.warn(`[ORDER DOWNLOAD] Error mapping business for order ${amplifyOrder.id}:`, error);
      }
    }

    // Map Amplify customer ID back to local customer ID
    let localCustomerId = amplifyOrder.customerId; // Default to Amplify ID
    let customerName = 'Downloaded Customer';
    let customerPhone = '';
    if (amplifyOrder.customerId) {
      try {
        await customerService.initialize();
        const customers = await customerService.getAllCustomers();
        
        // Try to find by amplifyId first, then by direct ID match
        let customer = customers.find(cust => cust.amplifyId === amplifyOrder.customerId) ||
                     customers.find(cust => cust.id === amplifyOrder.customerId);
        
        if (customer) {
          localCustomerId = customer.id;
          customerName = `${customer.firstName} ${customer.lastName}`;
          customerPhone = customer.phone || '';
          console.log(`[ORDER DOWNLOAD] Mapped Amplify customer ${amplifyOrder.customerId} to local customer ${localCustomerId} for order ${amplifyOrder.id}`);
        } else {
          console.warn(`[ORDER DOWNLOAD] No local customer found for Amplify customer ${amplifyOrder.customerId} for order ${amplifyOrder.id}. Order will use placeholder customer data.`);
          // Use a default customer name that shows it's from sync
          customerName = 'Unknown Customer (Synced)';
        }
      } catch (error) {
        console.warn(`[ORDER DOWNLOAD] Error mapping customer for order ${amplifyOrder.id}:`, error);
      }
    }

    // Map Amplify employee ID back to local employee ID
    let localEmployeeId = amplifyOrder.employeeId; // Default to Amplify ID
    let employeeName = '';
    if (amplifyOrder.employeeId) {
      try {
        await employeeService.initialize();
        const employees = await employeeService.getAllEmployees();
        
        // Try to find by amplifyId first, then by direct ID match
        const employee = employees.find(emp => emp.amplifyId === amplifyOrder.employeeId) ||
                        employees.find(emp => emp.id === amplifyOrder.employeeId);
        
        if (employee) {
          localEmployeeId = employee.id;
          employeeName = `${employee.firstName} ${employee.lastName}`;
          console.log(`[ORDER DOWNLOAD] Mapped Amplify employee ${amplifyOrder.employeeId} to local employee ${localEmployeeId} for order ${amplifyOrder.id}`);
        } else {
          console.warn(`[ORDER DOWNLOAD] No local employee found for Amplify employee ${amplifyOrder.employeeId} for order ${amplifyOrder.id}`);
        }
      } catch (error) {
        console.warn(`[ORDER DOWNLOAD] Error mapping employee for order ${amplifyOrder.id}:`, error);
      }
    }

    return {
      id: amplifyOrder.id, // Use Amplify ID as primary key for consistency
      orderNumber: amplifyOrder.orderNumber || `SYNC-${amplifyOrder.id.slice(-8)}`, // Use actual order number if available
      customerId: amplifyOrder.customerId, // Use Amplify customer ID for consistency
      customerName: amplifyOrder.customerName || customerName, // Use actual customer name from order or found customer
      customerPhone: amplifyOrder.customerPhone || customerPhone, // Use actual customer phone from order or found customer
      businessId: amplifyOrder.businessId, // Use Amplify business ID for consistency
      employeeId: amplifyOrder.employeeId, // Use Amplify employee ID for consistency
      employeeName: amplifyOrder.employeeName || employeeName, // Use actual employee name from order or found employee
      items: localItems,
      subtotal: amplifyOrder.subtotal || (amplifyOrder.total * 0.9), // Use actual subtotal or estimate
      tax: amplifyOrder.tax || (amplifyOrder.total * 0.1), // Use actual tax or estimate
      total: amplifyOrder.total || 0,
      paymentMethod: amplifyOrder.paymentMethod || 'cash',
      paymentInfo: amplifyOrder.paymentInfo ? JSON.parse(amplifyOrder.paymentInfo) : {
        method: amplifyOrder.paymentMethod || 'cash',
        amount: amplifyOrder.total || 0,
        tip: 0
      },
      status: amplifyOrder.status || 'completed',
      statusHistory: amplifyOrder.statusHistory ? JSON.parse(amplifyOrder.statusHistory) : [],
      notes: amplifyOrder.notes || '', // Use actual notes if available
      barcodeData: amplifyOrder.barcodeData || '', // Use actual barcode data if available
      rackNumber: amplifyOrder.rackNumber || '',
      selectedDate: amplifyOrder.selectedDate || new Date().toISOString(), // Use actual selected date or current date
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      amplifyId: amplifyOrder.id,
      createdAt: amplifyOrder.createdAt || new Date().toISOString(),
      updatedAt: amplifyOrder.updatedAt || new Date().toISOString()
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
    await orderService.initialize();
    
    const totalLocalCustomers = await customerService.getCustomersCount();
    const unsyncedCustomers = await customerService.getUnsyncedCustomers();
    const totalLocalEmployees = await employeeService.getEmployeesCount();
    const unsyncedEmployees = await employeeService.getUnsyncedEmployees();
    const allBusinesses = await businessService.getAllBusinesses();
    const totalLocalBusinesses = allBusinesses.length;
    const unsyncedBusinesses = await businessService.getUnsyncedBusinesses();
    const allCategories = await categoryService.getAllCategories();
    const totalLocalCategories = allCategories.length;
    const unsyncedCategories = await categoryService.getUnsyncedCategories();
    const allProducts = await productService.getAllProducts();
    const totalLocalProducts = allProducts.length;
    const unsyncedProducts = await productService.getUnsyncedProducts();
    const allOrders = await orderService.getAllOrders();
    const totalLocalOrders = allOrders.length;
    const unsyncedOrders = allOrders.filter(order => order.isLocalOnly);
    
    console.log(`[SYNC STATUS] Summary:`);
    console.log(`  Customers - Total: ${totalLocalCustomers}, Unsynced: ${unsyncedCustomers.length}`);
    console.log(`  Employees - Total: ${totalLocalEmployees}, Unsynced: ${unsyncedEmployees.length}`);
    console.log(`  Businesses - Total: ${totalLocalBusinesses}, Unsynced: ${unsyncedBusinesses.length}`);
    console.log(`  Categories - Total: ${totalLocalCategories}, Unsynced: ${unsyncedCategories.length}`);
    console.log(`  Products - Total: ${totalLocalProducts}, Unsynced: ${unsyncedProducts.length}`);
    console.log(`  Orders - Total: ${totalLocalOrders}, Unsynced: ${unsyncedOrders.length}`);
    
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
      totalLocalCategories,
      totalUnsyncedCategories: unsyncedCategories.length,
      totalLocalProducts,
      totalUnsyncedProducts: unsyncedProducts.length,
      totalLocalOrders,
      totalUnsyncedOrders: unsyncedOrders.length,
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
      ordersUploaded: 0,
      ordersDownloaded: 0,
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
          const amplifyCustomer = await this.convertCustomerToAmplifyFormat(customer);
          
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
          // Check if customer already exists locally by ID or amplifyId
          const existingCustomers = await customerService.getAllCustomers();
          const existingCustomer = existingCustomers.find(c => c.id === amplifyCustomer.id || c.amplifyId === amplifyCustomer.id);

          if (existingCustomer) {
            // Update existing customer if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyCustomer.updatedAt);
            const localUpdatedAt = new Date(existingCustomer.updatedAt);
            
            if (amplifyUpdatedAt > localUpdatedAt) {
              const localFormat = await this.convertCustomerToLocalFormat(amplifyCustomer);
              const result = await customerService.updateCustomer(existingCustomer.id, localFormat);
              if (result.customer && !result.errors && !result.duplicateError) {
                downloadedCount++;
                console.log(`Updated customer: ${amplifyCustomer.firstName} ${amplifyCustomer.lastName}`);
              }
            }
          } else {
            // Create new local customer with Amplify ID as primary key
            const localFormat = await this.convertCustomerToLocalFormat(amplifyCustomer);
            const result = await customerService.createCustomer(localFormat);
            
            if (result.customer) {
              downloadedCount++;
              console.log(`Downloaded new customer: ${amplifyCustomer.firstName} ${amplifyCustomer.lastName} with ID ${amplifyCustomer.id}`);
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
          const amplifyEmployee = await this.convertEmployeeToAmplifyFormat(employee);
          
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
          const amplifyCategory = await this.convertCategoryToAmplifyFormat(category);
          
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
   * Upload all local orders to Amplify
   */
  async uploadOrders(): Promise<SyncResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    const errors: string[] = [];
    let uploadedCount = 0;

    try {
      await orderService.initialize();
      const allOrders = await orderService.getAllOrders();
      const unsyncedOrders = allOrders.filter(order => order.isLocalOnly);

      console.log(`Starting upload of ${unsyncedOrders.length} orders...`);

      for (const order of unsyncedOrders) {
        try {
          // Convert local order to Amplify format
          const amplifyOrder = await this.convertOrderToAmplifyFormat(order);
          
          // Create order in Amplify
          if (!client.models || !client.models.Order) {
            throw new Error('Amplify Order model not configured. Please check your Amplify setup.');
          }
          const orderResponse = await (client.models as any).Order.create(amplifyOrder);
          
          if (orderResponse.data) {
            const amplifyOrderId = orderResponse.data.id;
            
            // Create OrderItems for this order
            if (order.items && order.items.length > 0) {
              for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                // Create multiple OrderItem records for each quantity
                for (let q = 0; q < item.quantity; q++) {
                  try {
                    const amplifyOrderItem = {
                      name: item.name,
                      description: item.description || '',
                      price: item.price || 0,
                      discount: item.discount || 0,
                      category: item.categoryId || '', // Use categoryId from item
                      businessId: amplifyOrder.businessId,
                      customerId: order.customerId,
                      employeeId: order.employeeId || '',
                      orderId: amplifyOrderId,
                      starch: item.options?.starch || 'none',
                      pressOnly: item.options?.pressOnly || false,
                      notes: item.options?.notes ? [item.options.notes] : []
                    };
                  
                    if (!client.models.OrderItem) {
                      throw new Error('Amplify OrderItem model not configured.');
                    }
                    
                    await (client.models as any).OrderItem.create(amplifyOrderItem);
                    console.log(`Created OrderItem: ${item.name} (${q + 1}/${item.quantity}) for order ${order.orderNumber}`);
                  } catch (itemError) {
                    console.error(`Error creating OrderItem ${item.name} for order ${order.orderNumber}:`, itemError);
                  }
                }
              }
            }
            
            // Mark as synced in local database
            await orderService.markAsSynced(order.id, amplifyOrderId);
            uploadedCount++;
            console.log(`Uploaded order: ${order.orderNumber}`);
          } else if (orderResponse.errors) {
            const error = `Failed to upload order ${order.orderNumber}: ${orderResponse.errors.map((e: any) => e.message).join(', ')}`;
            errors.push(error);
            console.error(error);
          }
        } catch (error) {
          const errorMsg = `Error uploading order ${order.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
              const localFormat = await this.convertCategoryToLocalFormat(amplifyCategory);
              const result = await categoryService.updateCategory(existingCategory.id, localFormat);
              if (result.category && !result.errors) {
                downloadedCount++;
                console.log(`Updated category: ${amplifyCategory.name}`);
              }
            }
          } else {
            // Create new local category
            const localFormat = await this.convertCategoryToLocalFormat(amplifyCategory);
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
              const localFormat = await this.convertEmployeeToLocalFormat(amplifyEmployee);
              const result = await employeeService.updateEmployee(existingEmployee.id, localFormat);
              if (result.employee && !result.errors && !result.duplicateError) {
                downloadedCount++;
                console.log(`Updated employee: ${amplifyEmployee.firstName} ${amplifyEmployee.lastName}`);
              }
            }
          } else {
            // Create new local employee
            const localFormat = await this.convertEmployeeToLocalFormat(amplifyEmployee);
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
      totalLocalProducts: 0,
      totalUnsyncedProducts: 0,
      totalLocalCategories: 0,
      totalUnsyncedCategories: 0,
      totalLocalOrders: 0,
      totalUnsyncedOrders: 0,
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
      ordersUploaded: 0,
      ordersDownloaded: 0,
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
      await orderService.initialize();
      
      // Get the initial status
      const initialStatus = await this.getSyncStatus();
      syncStatus.totalLocalCustomers = initialStatus.totalLocalCustomers;
      syncStatus.totalUnsyncedCustomers = initialStatus.totalUnsyncedCustomers;
      syncStatus.totalLocalEmployees = initialStatus.totalLocalEmployees;
      syncStatus.totalUnsyncedEmployees = initialStatus.totalUnsyncedEmployees;
      syncStatus.totalLocalBusinesses = initialStatus.totalLocalBusinesses;
      syncStatus.totalUnsyncedBusinesses = initialStatus.totalUnsyncedBusinesses;
      syncStatus.totalLocalProducts = initialStatus.totalLocalProducts;
      syncStatus.totalUnsyncedProducts = initialStatus.totalUnsyncedProducts;
      syncStatus.totalLocalCategories = initialStatus.totalLocalCategories;
      syncStatus.totalUnsyncedCategories = initialStatus.totalUnsyncedCategories;
      syncStatus.totalLocalOrders = initialStatus.totalLocalOrders;
      syncStatus.totalUnsyncedOrders = initialStatus.totalUnsyncedOrders;

      // Upload phase - Follow the correct sync order: business → employee → customer → category → product → order → orderitem
      console.log('Starting full sync - Upload phase (business → employee → customer → category → product → order → orderitem)');
      syncStatus.isUploading = true;
      
      // 1. Upload businesses FIRST (they need to exist before other entities can reference them)
      console.log('1. Uploading businesses...');
      const uploadBusinessesResult = await this.uploadBusinesses();
      syncStatus.businessesUploaded = uploadBusinessesResult.uploadedCount;
      
      // 2. Upload employees (need business IDs)
      console.log('2. Uploading employees...');
      const uploadEmployeesResult = await this.uploadEmployees();
      syncStatus.employeesUploaded = uploadEmployeesResult.uploadedCount;
      
      // 3. Upload customers (need business IDs)
      console.log('3. Uploading customers...');
      const uploadCustomersResult = await this.uploadCustomers();
      syncStatus.customersUploaded = uploadCustomersResult.uploadedCount;
      
      // 4. Upload categories (need business IDs)
      console.log('4. Uploading categories...');
      const uploadCategoriesResult = await this.uploadCategories();
      syncStatus.categoriesUploaded = uploadCategoriesResult.uploadedCount;
      
      // 5. Upload products (need category IDs and business IDs)
      console.log('5. Uploading products...');
      const uploadProductsResult = await this.uploadProducts();
      syncStatus.productsUploaded = uploadProductsResult.uploadedCount;
      
      // 6. Upload orders (need customer IDs, employee IDs, and business IDs)
      console.log('6. Uploading orders...');
      const uploadOrdersResult = await this.uploadOrders();
      syncStatus.ordersUploaded = uploadOrdersResult.uploadedCount;
      
      // Download phase - Follow the same sync order: business → employee → customer → category → product → order → orderitem
      console.log('Starting download phase (business → employee → customer → category → product → order → orderitem)');
      syncStatus.isUploading = false;
      syncStatus.isDownloading = true;
      
      // 1. Download businesses FIRST
      console.log('1. Downloading businesses...');
      const downloadBusinessesResult = await this.downloadBusinesses();
      syncStatus.businessesDownloaded = downloadBusinessesResult.downloadedCount;
      
      // 2. Download employees (can now reference local business IDs)
      console.log('2. Downloading employees...');
      const downloadEmployeesResult = await this.downloadEmployees();
      syncStatus.employeesDownloaded = downloadEmployeesResult.downloadedCount;
      
      // 3. Download customers (can now reference local business IDs)
      console.log('3. Downloading customers...');
      const downloadCustomersResult = await this.downloadCustomers();
      syncStatus.customersDownloaded = downloadCustomersResult.downloadedCount;
      
      // 4. Download categories (can now reference local business IDs)
      console.log('4. Downloading categories...');
      const downloadCategoriesResult = await this.downloadCategories();
      syncStatus.categoriesDownloaded = downloadCategoriesResult.downloadedCount;
      
      // 5. Download products (can now reference local category IDs and business IDs)
      console.log('5. Downloading products...');
      const downloadProductsResult = await this.downloadProducts();
      syncStatus.productsDownloaded = downloadProductsResult.downloadedCount;
      
      // 6. Download orders (can now reference local customer, employee, and business IDs)
      console.log('6. Downloading orders...');
      const downloadOrdersResult = await this.downloadOrders();
      syncStatus.ordersDownloaded = downloadOrdersResult.downloadedCount;
      
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

  // Upload orders method is already defined earlier in the class

  /**
   * Download orders from Amplify and sync to local database
   */
  async downloadOrders(): Promise<SyncResult> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    const errors: string[] = [];
    let downloadedCount = 0;

    try {
      await orderService.initialize();
      
      console.log('Starting download of orders from Amplify...');

      // Get all orders from Amplify
      if (!client.models || !client.models.Order) {
        throw new Error('Amplify Order model not configured. Please check your Amplify setup.');
      }
      const response = await (client.models as any).Order.list();
      
      if (response.errors) {
        errors.push(`Failed to fetch orders: ${response.errors.map((e: any) => e.message).join(', ')}`);
        return {
          success: false,
          uploadedCount: 0,
          downloadedCount: 0,
          errors
        };
      }

      const amplifyOrders = response.data || [];

      for (const amplifyOrder of amplifyOrders) {
        try {
          // Fetch OrderItems for this order
          let orderItems: any[] = [];
          try {
            if (client.models.OrderItem) {
              const itemsResponse = await (client.models as any).OrderItem.list({
                filter: { orderId: { eq: amplifyOrder.id } }
              });
              
              if (itemsResponse.data) {
                orderItems = itemsResponse.data;
              }
            }
          } catch (itemError) {
            console.warn(`Failed to fetch items for order ${amplifyOrder.id}:`, itemError);
            // Continue without items rather than failing the whole order
          }

          // Check if order already exists locally by amplifyId
          const existingOrders = await orderService.getAllOrders();
          const existingOrder = existingOrders.find(o => o.amplifyId === amplifyOrder.id);

          if (existingOrder) {
            // Update existing order if Amplify version is newer
            const amplifyUpdatedAt = new Date(amplifyOrder.updatedAt);
            const localUpdatedAt = new Date(existingOrder.updatedAt);
            
            if (amplifyUpdatedAt > localUpdatedAt) {
              const localFormat = await this.convertOrderToLocalFormat(amplifyOrder, orderItems);
              await orderService.updateOrder(existingOrder.id, localFormat);
              downloadedCount++;
              console.log(`Updated order: ${amplifyOrder.id} with ${orderItems.length} items`);
            }
          } else {
            // Create new local order
            const localFormat = await this.convertOrderToLocalFormat(amplifyOrder, orderItems);
            await orderService.createOrder({
              customer: {
                id: localFormat.customerId,
                firstName: localFormat.customerName?.split(' ')[0] || 'Unknown',
                lastName: localFormat.customerName?.split(' ').slice(1).join(' ') || 'Customer',
                phone: localFormat.customerPhone || ''
              } as SerializableCustomer,
              items: localFormat.items,
              paymentInfo: localFormat.paymentInfo,
              selectedDate: localFormat.selectedDate,
              notes: localFormat.notes,
              barcodeData: localFormat.barcodeData
            });
            
            // Mark as synced since it came from Amplify
            await orderService.markAsSynced(localFormat.id, amplifyOrder.id);
            downloadedCount++;
            console.log(`Downloaded new order: ${amplifyOrder.id} with ${orderItems.length} items`);
          }
        } catch (error) {
          const errorMsg = `Error processing order ${amplifyOrder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
          // Convert server model to local model (includes category ID mapping)
          const productData = await this.fromProductApiModel(serverProduct);
          
          console.log(`[PRODUCT DOWNLOAD] Processing product: ${serverProduct.name} (imageName: ${serverProduct.imageName || 'none'}, categoryId: ${productData.categoryId})`);

          // Check if we already have this product locally
          let localProduct: any = null;
          if (serverProduct.id) {
            const existingProducts = await productService.getAllProductsSorted();
            localProduct = existingProducts.find(p => p.amplifyId === serverProduct.id) || null;
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
