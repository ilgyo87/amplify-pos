import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../../schema';
import { CustomerSyncService } from './CustomerSyncService';
import { OrderSyncService } from './OrderSyncService';
import { EmployeeSyncService } from './EmployeeSyncService';
import { BusinessSyncService } from './BusinessSyncService';
import { CategorySyncService, CategoryConflict } from './CategorySyncService';
import { ProductSyncService, ProductConflict } from './ProductSyncService';
import { SyncResult } from './BaseSyncService';
import { BaseConflict, AllConflicts } from './conflictTypes';
import { SyncNotificationBuilder, SyncNotificationData } from './SyncNotification';

export interface SyncConflicts extends AllConflicts {
  // Keep backward compatibility
  categories: CategoryConflict[];
  products: ProductConflict[];
}

export interface FullSyncResult {
  success: boolean;
  results: {
    customers: SyncResult;
    employees: SyncResult;
    businesses: SyncResult;
    categories: SyncResult;
    products: SyncResult;
    orders: SyncResult;
  };
  summary: {
    totalSynced: number;
    totalFailed: number;
    totalErrors: string[];
  };
  conflicts?: SyncConflicts;
  notification?: SyncNotificationData;
}

export class SyncCoordinator {
  private customerSync: CustomerSyncService;
  private orderSync: OrderSyncService;
  private employeeSync: EmployeeSyncService;
  private businessSync: BusinessSyncService;
  private categorySync: CategorySyncService;
  private productSync: ProductSyncService;

  constructor() {
    this.customerSync = new CustomerSyncService();
    this.orderSync = new OrderSyncService();
    this.employeeSync = new EmployeeSyncService();
    this.businessSync = new BusinessSyncService();
    this.categorySync = new CategorySyncService();
    this.productSync = new ProductSyncService();
  }

  setDatabase(db: RxDatabase<DatabaseCollections>) {
    this.customerSync.setDatabase(db);
    this.orderSync.setDatabase(db);
    this.employeeSync.setDatabase(db);
    this.businessSync.setDatabase(db);
    this.categorySync.setDatabase(db);
    this.productSync.setDatabase(db);
  }

  async syncAll(): Promise<FullSyncResult> {
    // Create a master notification builder
    const masterNotificationBuilder = new SyncNotificationBuilder();
    
    // Sync in dependency order
    const results = {
      customers: await this.customerSync.sync(),
      employees: await this.employeeSync.sync(),
      businesses: await this.businessSync.sync(),
      categories: await this.categorySync.sync(),
      products: await this.productSync.sync(),
      orders: await this.orderSync.sync(), // Orders depend on customers and products
    };

    // Calculate summary and aggregate notifications
    let totalSynced = 0;
    let totalFailed = 0;
    const totalErrors: string[] = [];

    Object.entries(results).forEach(([entity, result]) => {
      totalSynced += result.stats.synced;
      totalFailed += result.stats.failed;
      
      if (result.errors.length > 0) {
        totalErrors.push(`${entity}: ${result.errors.join(', ')}`);
        result.errors.forEach(error => masterNotificationBuilder.addError(error));
      }

      // Aggregate operations from individual sync services
      if (result.notificationBuilder) {
        const notification = result.notificationBuilder.build(result.stats.synced, result.stats.failed);
        notification.operations.forEach(op => {
          masterNotificationBuilder.addOperation(
            op.entity,
            op.entityName,
            op.operation,
            op.direction,
            op.count,
            op.items
          );
        });
      }
    });

    const success = totalFailed === 0;

    // Only log if there were actual sync operations
    if (totalSynced > 0 || totalFailed > 0) {
      console.log('[SYNC] Synchronization complete:', {
        success,
        totalSynced,
        totalFailed,
        errorCount: totalErrors.length,
      });
    }

    // Check for conflicts
    const categoryConflicts = this.categorySync.getConflicts();
    const productConflicts = this.productSync.getConflicts();
    const hasConflicts = categoryConflicts.length > 0 || productConflicts.length > 0;
    
    // Build final notification
    const notification = masterNotificationBuilder.build(totalSynced, totalFailed);
    
    return {
      success,
      results,
      summary: {
        totalSynced,
        totalFailed,
        totalErrors,
      },
      conflicts: hasConflicts ? {
        categories: categoryConflicts,
        products: productConflicts
      } : undefined,
      notification,
    };
  }
  
  getConflicts(): SyncConflicts {
    return {
      categories: this.categorySync.getConflicts(),
      products: this.productSync.getConflicts()
    };
  }
  
  async resolveConflicts(
    categoryResolutions: Array<{categoryId: string, resolution: 'keep-local' | 'keep-cloud'}>,
    productResolutions: Array<{productId: string, resolution: 'keep-local' | 'keep-cloud'}>
  ): Promise<void> {
    await Promise.all([
      this.categorySync.resolveConflicts(categoryResolutions),
      this.productSync.resolveConflicts(productResolutions)
    ]);
  }

  async syncEntity(entityType: keyof FullSyncResult['results']): Promise<SyncResult> {
    switch (entityType) {
      case 'customers':
        return this.customerSync.sync();
      case 'orders':
        return this.orderSync.sync();
      case 'employees':
        return this.employeeSync.sync();
      case 'businesses':
        return this.businessSync.sync();
      case 'categories':
        return this.categorySync.sync();
      case 'products':
        return this.productSync.sync();
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  async getSyncStatus(db: RxDatabase<DatabaseCollections>) {
    const [
      customers,
      employees,
      businesses,
      categories,
      products,
      orders,
    ] = await Promise.all([
      db.customers.find().exec(),
      db.employees.find().exec(),
      db.businesses.find().exec(),
      db.categories.find().exec(),
      db.products.find().exec(),
      db.orders.find().exec(),
    ]);

    const getUnsyncedCount = (items: any[]) => 
      items.filter(item => {
        // Count items that need sync:
        // 1. New items (isLocalOnly = true)
        // 2. Deleted items that were previously synced (isDeleted = true && amplifyId exists and not empty)
        // 3. Items marked as needing sync
        return item.isLocalOnly || 
               (item.isDeleted && item.amplifyId && item.amplifyId !== '') || 
               item.needsSync;
      }).length;

    // Helper to get active (non-deleted) items count
    const getActiveCount = (items: any[]) => 
      items.filter(item => !item.isDeleted).length;

    return {
      customers: {
        total: getActiveCount(customers),
        unsynced: getUnsyncedCount(customers),
      },
      employees: {
        total: getActiveCount(employees),
        unsynced: getUnsyncedCount(employees),
      },
      businesses: {
        total: getActiveCount(businesses),
        unsynced: getUnsyncedCount(businesses),
      },
      categories: {
        total: getActiveCount(categories),
        unsynced: getUnsyncedCount(categories),
      },
      products: {
        total: getActiveCount(products),
        unsynced: getUnsyncedCount(products),
      },
      orders: {
        total: getActiveCount(orders),
        unsynced: getUnsyncedCount(orders),
      },
    };
  }
}