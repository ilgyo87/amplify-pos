import { createRxDatabase, RxDatabase, addRxPlugin, RxCollection } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

// Add RxDB plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBUpdatePlugin);

// Add dev mode plugin in development to get better error messages
if (__DEV__) {
  addRxPlugin(RxDBDevModePlugin);
  // Disable dev-mode warnings
  const { disableWarnings } = require('rxdb/plugins/dev-mode');
  disableWarnings();
}

import { customerSchema, CustomerCollection, CustomerDocType, CustomerDocument } from './schemas/customer';
import { employeeSchema, EmployeeCollection, EmployeeDocType, EmployeeDocument } from './schemas/employee';
import { categorySchema, CategoryCollection, CategoryDocType, CategoryDocument } from './schemas/category';
import { productSchema, ProductCollection, ProductDocType, ProductDocument } from './schemas/product';
import { businessSchema, BusinessCollection, BusinessDocType, BusinessDocument } from './schemas/business';
import { orderSchema, OrderCollection, OrderDocType, OrderDocument } from './schemas/order';

export interface DatabaseCollections {
  customers: CustomerCollection;
  employees: EmployeeCollection;
  categories: CategoryCollection;
  products: ProductCollection;
  businesses: BusinessCollection;
  orders: OrderCollection;
}

// Extend the RxDatabase type with our collections
export type AppDatabase = RxDatabase<DatabaseCollections>;

let databaseInstance: AppDatabase | null = null;
let databasePromise: Promise<AppDatabase> | null = null;

/**
 * Get or create the database instance
 */
export const getDatabaseInstance = async (): Promise<AppDatabase> => {
  if (databaseInstance) {
    return databaseInstance;
  }
  
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
};

const createDatabase = async (): Promise<AppDatabase> => {
  // Clean up any existing database instances to avoid hitting collection limits
  await forceCleanup();

  // Use memory storage with validation wrapper for dev-mode
  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageMemory()
  });

  try {
    const database = await createRxDatabase<DatabaseCollections>({
      name: 'amplifyposdb_v5',
      storage,
      multiInstance: false, // Set to false in React Native
      ignoreDuplicate: true,
      allowSlowCount: true, // Allow count() queries in slow mode
      cleanupPolicy: {
        minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // one week
        minimumCollectionAge: 1000 * 60 * 60 * 24 * 7, // one week
        runEach: 1000 * 60 * 60 * 24, // one day
        awaitReplicationsInSync: true,
        waitForLeadership: true
      }
    });
    
    // Add collections with their methods
    try {
      await database.addCollections({
        customers: {
          schema: customerSchema
        },
        employees: {
          schema: employeeSchema
        },
        categories: {
          schema: categorySchema
        },
        products: {
          schema: productSchema
        },
        businesses: {
          schema: businessSchema
        },
        orders: {
          schema: orderSchema
          // No migration strategies needed for fresh database
        }
      });
      
      // Store the instance for reuse
      databaseInstance = database;
      databasePromise = null;
      return database;
    } catch (error) {
      console.error('Error adding collections:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database creation error:', error);
    throw error;
  }
};

export const closeDatabase = async () => {
  try {
    if (databaseInstance) {
      await databaseInstance.remove();
      databaseInstance = null;
    }
    if (databasePromise) {
      const db = await databasePromise;
      await db.remove();
      databasePromise = null;
    }
  } catch (error) {
    console.log('Database cleanup completed');
  }
};

/**
 * Force cleanup of all databases - useful for development
 */
export const forceCleanup = async () => {
  try {
    if (databaseInstance) {
      await databaseInstance.remove();
      databaseInstance = null;
    }
    if (databasePromise) {
      const db = await databasePromise;
      await db.remove();
      databasePromise = null;
    }
  } catch (error) {
    console.log('Database cleanup completed');
  }
};