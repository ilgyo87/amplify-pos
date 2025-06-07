import { createRxDatabase, RxDatabase, addRxPlugin, RxCollection } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

// Add RxDB plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBUpdatePlugin);

// Add dev mode plugin in development to get better error messages
addRxPlugin(RxDBDevModePlugin);

import { customerSchema, CustomerCollection, CustomerDocType, CustomerDocument, CustomerCollectionMethods } from './schemas/customer';

export interface DatabaseCollections {
  customers: CustomerCollection;
}

// Extend the RxDatabase type with our collections
export type AppDatabase = RxDatabase<DatabaseCollections>;

let databasePromise: Promise<AppDatabase> | null = null;

/**
 * Get or create the database instance
 */
export const getDatabaseInstance = async (): Promise<AppDatabase> => {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
};

const createDatabase = async (): Promise<AppDatabase> => {
  // Get the base memory storage
  const memoryStorage = getRxStorageMemory();
  
  // Wrap the memory storage with AJV validator
  // This is required when using dev-mode plugin
  const validatedStorage = wrappedValidateAjvStorage({
    storage: memoryStorage
  });
  
  try {
    const database = await createRxDatabase<DatabaseCollections>({
      name: 'amplify_pos_db',
      storage: validatedStorage,
      multiInstance: false,
      eventReduce: true,
      ignoreDuplicate: true, // Ignore duplicate database instances
      options: {
        // Explicitly disable all features that might require crypto
        disableKeyCompression: true,
        disableHash: true,
        disableEncryption: true
      },
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
          methods: {
            // Collection methods
            async countAll() {
              const docs = await (this as unknown as RxCollection<CustomerDocType>).find().exec();
              return docs.length;
            },
            async findByEmail(email: string) {
              const results = await (this as unknown as RxCollection<CustomerDocType>).find({
                selector: { email, isDeleted: { $ne: true } }
              }).exec();
              return results.length > 0 ? results[0] : null;
            },
            async findByPhone(phone: string) {
              const results = await (this as unknown as RxCollection<CustomerDocType>).find({
                selector: { phone, isDeleted: { $ne: true } }
              }).exec();
              return results.length > 0 ? results[0] : null;
            },
            async searchByName(searchTerm: string) {
              const allCustomers = await (this as unknown as RxCollection<CustomerDocType>).find({
                selector: { isDeleted: { $ne: true } }
              }).exec();
              
              const searchTermLower = searchTerm.toLowerCase();
              return allCustomers.filter((customer: CustomerDocument) => 
                customer.firstName.toLowerCase().includes(searchTermLower) ||
                customer.lastName.toLowerCase().includes(searchTermLower) ||
                `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTermLower)
              );
            }
          } as unknown as CustomerCollectionMethods
        }
      });
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
  if (databasePromise) {
    const db = await databasePromise;
    await db.remove();
    databasePromise = null;
  }
};