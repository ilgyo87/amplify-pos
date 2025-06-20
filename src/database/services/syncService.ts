import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../schema';
import { SyncCoordinator, SyncConflicts } from './sync/SyncCoordinator';
import { SyncNotificationData } from './sync/SyncNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEventEmitter } from './syncEventEmitter';

const LAST_SYNC_NOTIFICATION_KEY = '@last_sync_notification';

class SyncService {
  private coordinator: SyncCoordinator;
  private db: RxDatabase<DatabaseCollections> | null = null;

  constructor() {
    this.coordinator = new SyncCoordinator();
  }

  setDatabase(db: RxDatabase<DatabaseCollections>) {
    this.db = db;
    this.coordinator.setDatabase(db);
  }

  async syncAll() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.coordinator.syncAll();
    
    // Save notification to storage
    if (result.notification) {
      await this.saveLastSyncNotification(result.notification);
    }
    
    // Emit sync complete event
    syncEventEmitter.emitSyncComplete();
    
    return result;
  }

  async syncEntity(entityType: 'customers' | 'orders' | 'employees' | 'businesses' | 'categories' | 'products' | 'racks') {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.coordinator.syncEntity(entityType);
    
    // Emit sync complete event
    syncEventEmitter.emitSyncComplete();
    
    return result;
  }
  
  getConflicts(): SyncConflicts {
    return this.coordinator.getConflicts();
  }
  
  async resolveConflicts(
    categoryResolutions: Array<{categoryId: string, resolution: 'keep-local' | 'keep-cloud'}>,
    productResolutions: Array<{productId: string, resolution: 'keep-local' | 'keep-cloud'}>
  ): Promise<void> {
    return this.coordinator.resolveConflicts(categoryResolutions, productResolutions);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats = await this.coordinator.getSyncStatus(this.db);
    
    // Convert from new format to legacy format for backward compatibility
    return {
      isUploading: false,
      isDownloading: false,
      totalLocalCustomers: stats.customers?.total || 0,
      totalUnsyncedCustomers: stats.customers?.unsynced || 0,
      totalLocalEmployees: stats.employees?.total || 0,
      totalUnsyncedEmployees: stats.employees?.unsynced || 0,
      totalLocalBusinesses: stats.businesses?.total || 0,
      totalUnsyncedBusinesses: stats.businesses?.unsynced || 0,
      totalLocalProducts: stats.products?.total || 0,
      totalUnsyncedProducts: stats.products?.unsynced || 0,
      totalLocalCategories: stats.categories?.total || 0,
      totalUnsyncedCategories: stats.categories?.unsynced || 0,
      totalLocalOrders: stats.orders?.total || 0,
      totalUnsyncedOrders: stats.orders?.unsynced || 0,
      totalLocalRacks: stats.racks?.total || 0,
      totalUnsyncedRacks: stats.racks?.unsynced || 0,
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
      racksUploaded: 0,
      racksDownloaded: 0,
    };
  }

  // Legacy methods for compatibility
  async sync() {
    const result = await this.syncAll();
    return {
      success: result.success,
      stats: {
        total: result.summary.totalSynced + result.summary.totalFailed,
        synced: result.summary.totalSynced,
        failed: result.summary.totalFailed,
        skipped: 0,
      },
      errors: result.summary.totalErrors,
    };
  }

  // Legacy upload methods for backward compatibility
  async uploadCustomers() { 
    const result = await this.syncEntity('customers');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadEmployees() { 
    const result = await this.syncEntity('employees');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadCategories() { 
    const result = await this.syncEntity('categories');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadProducts() { 
    const result = await this.syncEntity('products');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadBusinesses() { 
    const result = await this.syncEntity('businesses');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadOrders() { 
    const result = await this.syncEntity('orders');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  async uploadRacks() { 
    const result = await this.syncEntity('racks');
    return {
      uploadedCount: result.stats?.synced || 0,
      downloadedCount: 0,
      errors: result.errors || []
    };
  }
  
  // Legacy download methods for backward compatibility  
  async downloadCustomers() { 
    const result = await this.syncEntity('customers');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadEmployees() { 
    const result = await this.syncEntity('employees');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadCategories() { 
    const result = await this.syncEntity('categories');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadProducts() { 
    const result = await this.syncEntity('products');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadBusinesses() { 
    const result = await this.syncEntity('businesses');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadOrders() { 
    const result = await this.syncEntity('orders');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  async downloadRacks() { 
    const result = await this.syncEntity('racks');
    return {
      uploadedCount: 0,
      downloadedCount: result.stats?.synced || 0,
      errors: result.errors || []
    };
  }
  
  // Legacy full sync method
  async fullSync() { return this.syncAll(); }
  
  // Legacy fix method - no longer needed but kept for compatibility
  async fixProductCategoryRelationships() {
    return { success: true, message: 'Relationships are automatically maintained' };
  }

  // Save last sync notification
  private async saveLastSyncNotification(notification: SyncNotificationData) {
    try {
      await AsyncStorage.setItem(LAST_SYNC_NOTIFICATION_KEY, JSON.stringify(notification));
    } catch (error) {
      console.error('Failed to save last sync notification:', error);
    }
  }

  // Get last sync notification
  async getLastSyncNotification(): Promise<SyncNotificationData | null> {
    try {
      const data = await AsyncStorage.getItem(LAST_SYNC_NOTIFICATION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get last sync notification:', error);
      return null;
    }
  }

  // Clear last sync notification
  async clearLastSyncNotification() {
    try {
      await AsyncStorage.removeItem(LAST_SYNC_NOTIFICATION_KEY);
    } catch (error) {
      console.error('Failed to clear last sync notification:', error);
    }
  }
}

export const syncService = new SyncService();
export { SyncService };

// Re-export types for backward compatibility
export type { SyncResult } from './sync/BaseSyncService';
export type { FullSyncResult } from './sync/SyncCoordinator';
export { SyncNotificationBuilder } from './sync/SyncNotification';
export type { SyncNotificationData } from './sync/SyncNotification';

// Define the SyncStatus type based on what DataSyncScreen expects
export interface SyncStatus {
  isUploading: boolean;
  isDownloading: boolean;
  totalLocalCustomers: number;
  totalUnsyncedCustomers: number;
  totalLocalEmployees: number;
  totalUnsyncedEmployees: number;
  totalLocalBusinesses: number;
  totalUnsyncedBusinesses: number;
  totalLocalProducts: number;
  totalUnsyncedProducts: number;
  totalLocalCategories: number;
  totalUnsyncedCategories: number;
  totalLocalOrders: number;
  totalUnsyncedOrders: number;
  totalLocalRacks: number;
  totalUnsyncedRacks: number;
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
  racksUploaded: number;
  racksDownloaded: number;
  lastSyncedAt?: string;
}