import { RxDocument, RxCollection } from 'rxdb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base repository class that provides common CRUD operations
 * @template T - The document type this repository works with
 * @template C - The collection type (extends RxCollection)
 */
export abstract class BaseRepository<T, C extends RxCollection = RxCollection> {
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
      isLocalOnly: true, // New documents are local by default
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
        updatedAt: new Date().toISOString()
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
  async findUnsyncedDocuments(): Promise<RxDocument<T>[]> {
    // Get all local-only, non-deleted documents
    const localOnlyDocs = await this.collection
      .find({
        selector: {
          isDeleted: { $ne: true },
          isLocalOnly: true
        }
      })
      .exec();

    // Filter for documents that are truly unsynced
    // Either no lastSyncedAt or updatedAt is newer than lastSyncedAt
    return localOnlyDocs.filter(doc => {
      const data = doc.toJSON();
      if (!data.lastSyncedAt) {
        return true; // Never synced
      }
      
      // Compare dates: if updatedAt is newer than lastSyncedAt, it needs sync
      const updatedAt = new Date(data.updatedAt);
      const lastSyncedAt = new Date(data.lastSyncedAt);
      return updatedAt > lastSyncedAt;
    });
  }

  /**
   * Mark a document as synced
   */
  async markAsSynced(id: string, amplifyId?: string): Promise<RxDocument<T> | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    
    const updateData: any = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updateData.amplifyId = amplifyId;
    }
    
    await doc.update({
      $set: updateData
    });
    
    return this.findById(id);
  }
}
