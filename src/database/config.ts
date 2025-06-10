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
      name: `amplifyposdb_${Date.now()}`,
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
          schema: customerSchema,
          migrationStrategies: {
            // Migration from version 0 to 1 - add notes and joinDate fields
            1: function(oldDoc: any) {
              return {
                ...oldDoc,
                notes: oldDoc.notes || null,
                joinDate: oldDoc.joinDate || null
              };
            },
            // Migration from version 1 to 2 - allow null values for optional fields
            2: function(oldDoc: any) {
              // No data transformation needed, just schema validation change
              return oldDoc;
            },
            // Migration from version 2 to 3 - remove problematic indexes
            3: function(oldDoc: any) {
              // No data transformation needed, just index change
              return oldDoc;
            }
          }
        },
        employees: {
          schema: employeeSchema
        },
        categories: {
          schema: categorySchema
        },
        products: {
          schema: productSchema,
          migrationStrategies: {
            // Migration from version 0 to 1 - add new sync fields
            1: function(oldDoc: any) {
              return {
                ...oldDoc,
                sku: oldDoc.sku || null,
                cost: oldDoc.cost || null,
                barcode: oldDoc.barcode || null,
                quantity: oldDoc.quantity || null,
                isActive: oldDoc.isActive !== undefined ? oldDoc.isActive : true
              };
            }
          }
        },
        businesses: {
          schema: businessSchema
        },
        orders: {
          schema: orderSchema,
          migrationStrategies: {
            // Migration from version 0 to 1 - initial creation
            1: function(oldDoc: any) {
              return oldDoc;
            }
          }
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