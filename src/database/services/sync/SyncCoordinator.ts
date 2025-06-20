import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../../schema';
import { CustomerSyncService } from './CustomerSyncService';
import { OrderSyncService } from './OrderSyncService';
import { EmployeeSyncService } from './EmployeeSyncService';
import { BusinessSyncService } from './BusinessSyncService';
import { CategorySyncService } from './CategorySyncService';
import { ProductSyncService } from './ProductSyncService';
import { SyncResult } from './BaseSyncService';

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
    // Sync in dependency order
    const results = {
      customers: await this.customerSync.sync(),
      employees: await this.employeeSync.sync(),
      businesses: await this.businessSync.sync(),
      categories: await this.categorySync.sync(),
      products: await this.productSync.sync(),
      orders: await this.orderSync.sync(), // Orders depend on customers and products
    };

    // Calculate summary
    let totalSynced = 0;
    let totalFailed = 0;
    const totalErrors: string[] = [];

    Object.entries(results).forEach(([entity, result]) => {
      totalSynced += result.stats.synced;
      totalFailed += result.stats.failed;
      
      if (result.errors.length > 0) {
        totalErrors.push(`${entity}: ${result.errors.join(', ')}`);
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

    return {
      success,
      results,
      summary: {
        totalSynced,
        totalFailed,
        totalErrors,
      },
    };
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
      items.filter(item => item.needsSync || item.isLocalOnly).length;

    return {
      customers: {
        total: customers.length,
        unsynced: getUnsyncedCount(customers),
      },
      employees: {
        total: employees.length,
        unsynced: getUnsyncedCount(employees),
      },
      businesses: {
        total: businesses.length,
        unsynced: getUnsyncedCount(businesses),
      },
      categories: {
        total: categories.length,
        unsynced: getUnsyncedCount(categories),
      },
      products: {
        total: products.length,
        unsynced: getUnsyncedCount(products),
      },
      orders: {
        total: orders.length,
        unsynced: getUnsyncedCount(orders),
      },
    };
  }
}