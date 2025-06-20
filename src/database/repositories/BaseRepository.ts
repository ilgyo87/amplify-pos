import { RxDocument, RxCollection } from 'rxdb';
import { v4 as uuidv4 } from 'uuid';

// Interface for sync-related properties that all documents should have
interface SyncableDocument {
  isLocalOnly?: boolean;
  lastSyncedAt?: string;
  amplifyId?: string;
  updatedAt: string;
}

/**
 * Base repository class that provides common CRUD operations
 * @template T - The document type this repository works with
 * @template C - The collection type (extends RxCollection)
 */
export abstract class BaseRepository<T extends SyncableDocument, C extends RxCollection = RxCollection> {
  /** The RxDB collection instance */
  protected collection: C;
  protected idPrefix: string;

  constructor(collection: C) {
    this.collection = collection;
    // Default prefix, will be set by child classes if needed
    this.idPrefix = 'item_';
  }

  /**
   * Generate a random ID for new documents
   * @param customPrefix - Optional custom prefix that overrides the default collection-based prefix
   */
  protected generateId(): string {
    return `${this.idPrefix}${uuidv4()}`;
  }
  
  /**
   * Sanitize document values to ensure they are compatible with RxDB schema
   * Specifically fixes floating point precision issues for monetary values
   */
  private sanitizeDocumentValues<D>(data: D): D {
    if (!data || typeof data !== 'object') return data;
    
    const sanitizedData = { ...data } as any;
    
    // Fix known monetary fields that need to be exact multiples of 0.01
    const monetaryFields = ['subtotal', 'tax', 'total', 'price', 'amount'];
    
    Object.keys(sanitizedData).forEach(key => {
      const value = sanitizedData[key];
      
      // Handle monetary fields - ensure exact precision
      if (monetaryFields.includes(key) && typeof value === 'number') {
        // Convert to string with fixed 2 decimal places
        const stringValue = value.toFixed(2);
        
        // Convert back to number - this ensures it's a valid multiple of 0.01
        sanitizedData[key] = parseFloat(stringValue);
      }
      
      // Process nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitizedData[key] = this.sanitizeDocumentValues(value);
      }
      
      // Process arrays containing objects
      if (Array.isArray(value)) {
        sanitizedData[key] = value.map(item => {
          if (item && typeof item === 'object') {
            return this.sanitizeDocumentValues(item);
          }
          return item;
        });
      }
    });
    
    return sanitizedData as D;
  }

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<RxDocument<T> | null> {
    return this.collection.findOne(id).exec();
  }

  /**
   * Find all documents in the collection
   * Excludes soft-deleted documents by default
   */
  async findAll(): Promise<RxDocument<T>[]> {
    return this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<RxDocument<T>> {
    const now = new Date().toISOString();
    
    // Fix floating point issues for monetary values before inserting
    const processedData = this.sanitizeDocumentValues(data);
    
    const doc = {
      ...processedData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      // Only set isLocalOnly to true if it's not already specified in the data
      // This allows synced documents from Amplify to have isLocalOnly: false
      isLocalOnly: (processedData as any).isLocalOnly !== undefined ? (processedData as any).isLocalOnly : true,
      isDeleted: false   // Ensure soft delete flag is set
    } as unknown as T;
    
    const result = await this.collection.insert(doc);
    
    // Log the creation
    const collectionName = this.idPrefix.replace('_', '');
    console.log(`[${new Date().toLocaleString()}] CREATED: ${collectionName} - ID: ${result.id}`);
    
    return result;
  }

  /**
   * Update an existing document
   */
  async update(id: string, data: Partial<T>): Promise<RxDocument<T> | null> {
    try {
      const document = await this.findById(id);
      if (!document) return null;
      
      // Fix floating point issues for monetary values before updating
      const processedData = this.sanitizeDocumentValues(data);
      
      const doc = {
        ...processedData,
        updatedAt: new Date().toISOString(),
        // Mark as unsynced when updated locally
        isLocalOnly: true
      };
      
      await document.update({
        $set: doc
      });
      
      return document;
    } catch (err) {
      console.error(`Error updating ${this.idPrefix} with id ${id}:`, err);
      return null;
    }
  }

  /**
   * Hard delete a document
   */
  async delete(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    if (!doc) return false;
    
    await doc.remove();
    
    // Log the hard delete
    const collectionName = this.idPrefix.replace('_', '');
    console.log(`[${new Date().toLocaleString()}] HARD DELETED: ${collectionName} - ID: ${id}`);
    
    return true;
  }

  /**
   * Soft delete a document by setting isDeleted flag
   */
  async softDelete(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    if (!doc) return false;
    
    await doc.update({
      $set: {
        isDeleted: true,
        updatedAt: new Date().toISOString()
      }
    });
    
    // Log the soft delete
    const collectionName = this.idPrefix.replace('_', '');
    console.log(`[${new Date().toLocaleString()}] DELETED: ${collectionName} - ID: ${id}`);
    
    return true;
  }

  /**
   * Restore a soft-deleted document
   */
  async restore(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    if (!doc) return false;
    
    await doc.update({
      $set: {
        isDeleted: false,
        updatedAt: new Date().toISOString()
      }
    });
    
    return true;
  }

  /**
   * Find all documents that haven't been synced yet
   */
  async findUnsyncedDocuments(forceRefresh = false): Promise<RxDocument<T>[]> {
    // If force refresh is requested, clear any cached queries
    if (forceRefresh) {
      console.log(`[REPOSITORY] Force refreshing unsynced documents query...`);
      // Adding a longer delay to ensure any pending writes are committed
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Debug: Get all documents to see what's actually in the database
    const allDocs = await this.collection
      .find({
        selector: {
          isDeleted: { $ne: true }
        }
      })
      .exec();

    console.log(`[REPOSITORY] DEBUG - All documents in collection:`, 
      allDocs.map(doc => {
        const data = doc.toJSON();
        return {
          id: data.id,
          isLocalOnly: data.isLocalOnly,
          lastSyncedAt: data.lastSyncedAt,
          amplifyId: data.amplifyId
        };
      })
    );

    // Get all local-only, non-deleted documents
    const localOnlyDocs = await this.collection
      .find({
        selector: {
          isDeleted: { $ne: true },
          isLocalOnly: true
        }
      })
      .exec();

    console.log(`[REPOSITORY] Found ${localOnlyDocs.length} local-only documents`);

    // Filter for documents that are truly unsynced
    // Either no lastSyncedAt or updatedAt is newer than lastSyncedAt
    const unsyncedDocs = localOnlyDocs.filter(doc => {
      const data = doc.toJSON();
      if (!data.lastSyncedAt) {
        console.log(`[REPOSITORY] Document ${data.id} never synced (no lastSyncedAt)`);
        return true; // Never synced
      }
      
      // Compare dates: if updatedAt is newer than lastSyncedAt, it needs sync
      const updatedAt = new Date(data.updatedAt);
      const lastSyncedAt = new Date(data.lastSyncedAt);
      const needsSync = updatedAt > lastSyncedAt;
      
      if (needsSync) {
        console.log(`[REPOSITORY] Document ${data.id} needs sync - updatedAt: ${data.updatedAt}, lastSyncedAt: ${data.lastSyncedAt}`);
      } else {
        console.log(`[REPOSITORY] Document ${data.id} is up to date but still marked as isLocalOnly: true`);
      }
      
      return needsSync;
    });

    console.log(`[REPOSITORY] After filtering, ${unsyncedDocs.length} documents need sync`);
    return unsyncedDocs;
  }

  /**
   * Mark a document as synced
   */
  async markAsSynced(id: string, amplifyId?: string): Promise<RxDocument<T> | null> {
    const doc = await this.findById(id);
    if (!doc) {
      console.warn(`[REPOSITORY] Cannot mark as synced - document not found: ${id}`);
      return null;
    }
    
    const beforeData = doc.toJSON();
    console.log(`[REPOSITORY] BEFORE marking as synced - Document ${id}: isLocalOnly=${beforeData.isLocalOnly}, lastSyncedAt=${beforeData.lastSyncedAt}`);
    
    const updateData: any = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updateData.amplifyId = amplifyId;
    }
    
    console.log(`[REPOSITORY] Marking document as synced: ${id}, amplifyId: ${amplifyId || 'none'}, updateData:`, updateData);
    
    try {
      await doc.update({
        $set: updateData
      });
      
      // Wait for the database operation to commit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the update was successful by re-querying
      const updatedDoc = await this.findById(id);
      if (updatedDoc) {
        const afterData = updatedDoc.toJSON();
        console.log(`[REPOSITORY] AFTER marking as synced - Document ${id}: isLocalOnly=${afterData.isLocalOnly}, lastSyncedAt=${afterData.lastSyncedAt}`);
        
        if (afterData.isLocalOnly === true) {
          console.error(`[REPOSITORY] ERROR: Document ${id} still has isLocalOnly=true after sync update!`);
          
          // Try a more aggressive update
          console.log(`[REPOSITORY] Attempting aggressive update for document ${id}`);
          await updatedDoc.update({
            $set: { isLocalOnly: false }
          });
          
          // Wait and check again
          await new Promise(resolve => setTimeout(resolve, 100));
          const reCheckedDoc = await this.findById(id);
          if (reCheckedDoc) {
            const recheckData = reCheckedDoc.toJSON();
            console.log(`[REPOSITORY] After aggressive update - Document ${id}: isLocalOnly=${recheckData.isLocalOnly}`);
          }
        }
      }
      
      return updatedDoc;
    } catch (error) {
      console.error(`[REPOSITORY] Error marking document ${id} as synced:`, error);
      return null;
    }
  }
}
