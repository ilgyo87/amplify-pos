import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { customerService } from './customerService';
import { CustomerDocument } from '../schemas/customer';

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
}

export class SyncService {
  private isUploading = false;
  private isDownloading = false;
  private lastSyncDate?: Date;

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    await customerService.initialize();
    
    const totalLocalCustomers = await customerService.getCustomersCount();
    const unsyncedCustomers = await customerService.getUnsyncedCustomers();
    
    return {
      isUploading: this.isUploading,
      isDownloading: this.isDownloading,
      lastSyncDate: this.lastSyncDate,
      totalLocalCustomers,
      totalUnsyncedCustomers: unsyncedCustomers.length
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
          const response = await client.models.Customer.create(amplifyCustomer);
          
          if (response.data) {
            // Mark as synced in local database
            await customerService.markAsSynced(customer.id, response.data.id);
            uploadedCount++;
            console.log(`Uploaded customer: ${customer.firstName} ${customer.lastName}`);
          } else if (response.errors) {
            const error = `Failed to upload ${customer.firstName} ${customer.lastName}: ${response.errors.map(e => e.message).join(', ')}`;
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
      const response = await client.models.Customer.list();
      
      if (response.errors) {
        errors.push(`Failed to fetch customers: ${response.errors.map(e => e.message).join(', ')}`);
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
   * Full sync: upload first, then download
   */
  async fullSync(): Promise<SyncResult> {
    console.log('Starting full sync...');
    
    // First upload local changes
    const uploadResult = await this.uploadCustomers();
    
    // Then download remote changes
    const downloadResult = await this.downloadCustomers();
    
    return {
      success: uploadResult.success && downloadResult.success,
      uploadedCount: uploadResult.uploadedCount,
      downloadedCount: downloadResult.downloadedCount,
      errors: [...uploadResult.errors, ...downloadResult.errors]
    };
  }

  /**
   * Convert local customer format to Amplify format
   */
  private convertToAmplifyFormat(customer: CustomerDocument): any {
    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || undefined,
      phone: customer.phone,
      address: customer.address || undefined,
      city: customer.city || undefined,
      state: customer.state || undefined,
      zipCode: customer.zipCode || undefined,
      coordinates: customer.coordinates || undefined,
      businessId: customer.businessId || undefined,
      cognitoId: customer.cognitoId || undefined
    };
  }

  /**
   * Convert Amplify customer format to local format
   */
  private convertToLocalFormat(amplifyCustomer: any): any {
    return {
      firstName: amplifyCustomer.firstName,
      lastName: amplifyCustomer.lastName,
      email: amplifyCustomer.email || '',
      phone: amplifyCustomer.phone,
      address: amplifyCustomer.address || '',
      city: amplifyCustomer.city || '',
      state: amplifyCustomer.state || '',
      zipCode: amplifyCustomer.zipCode || ''
    };
  }
}

export const syncService = new SyncService();