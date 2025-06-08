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
if (__DEV__) {
  addRxPlugin(RxDBDevModePlugin);
}

import { customerSchema, CustomerCollection, CustomerDocType, CustomerDocument } from './schemas/customer';

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
  // Use memory storage wrapped with validation
  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageMemory()
  });

  try {
    const database = await createRxDatabase<DatabaseCollections>({
      name: 'amplifyposdb',
      storage,
      multiInstance: false, // Set to false in React Native
      ignoreDuplicate: true,
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