import { generateClient, GraphQLResult } from 'aws-amplify/api';
import { AppSyncClient } from '../../../types/api';
import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../../schema';

export interface SyncStats {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
}

export interface SyncResult {
  success: boolean;
  stats: SyncStats;
  errors: string[];
}

export abstract class BaseSyncService<T> {
  protected client: AppSyncClient;
  protected db: RxDatabase<DatabaseCollections> | null = null;
  protected errors: string[] = [];

  constructor() {
    this.client = generateClient() as AppSyncClient;
  }

  setDatabase(db: RxDatabase<DatabaseCollections>) {
    this.db = db;
  }

  protected async handleGraphQLResult<R>(
    result: GraphQLResult<R>,
    operation: string
  ): Promise<R | null> {
    console.log(`[SYNC] ${operation} full result:`, JSON.stringify(result, null, 2));
    
    if (result.errors) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      this.errors.push(`${operation} failed: ${errorMessages}`);
      console.error(`[SYNC] ${operation} GraphQL errors:`, result.errors);
      return null;
    }
    
    if (!result.data) {
      this.errors.push(`${operation} returned no data`);
      console.error(`[SYNC] ${operation} returned no data`);
      return null;
    }
    
    return result.data;
  }

  protected cleanGraphQLData(data: any): any {
    const cleaned = { ...data };
    
    // Remove GraphQL metadata fields
    delete cleaned.__typename;
    delete cleaned._version;
    delete cleaned._lastChangedAt;
    delete cleaned._deleted;
    
    // Remove null values
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === null) {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abstract sync(): Promise<SyncResult>;
}