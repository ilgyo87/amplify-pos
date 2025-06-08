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
    // Default prefix based on collection name, fallback to 'item_' if not available
    this.idPrefix = collection.name ? `${collection.name}_` : 'item_';
  }

  /**
   * Generate a random ID for new documents
   * @param customPrefix - Optional custom prefix that overrides the default collection-based prefix
   */
  protected generateId(customPrefix?: string): string {
    const prefix = customPrefix || this.idPrefix;
    return `${prefix}${uuidv4()}`;
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
    const doc = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      isLocalOnly: true, // New documents are local by default
      isDeleted: false   // Ensure soft delete flag is set
    } as unknown as T;
    const result = await this.collection.insert(doc);
    
    // Log the creation
    const collectionName = this.collection.name;
    console.log(`[${new Date().toLocaleString()}] CREATED: ${collectionName} - ID: ${result.id}`);
    
    return result;
  }

  /**
   * Update an existing document
   */
  async update(id: string, data: Partial<T>): Promise<RxDocument<T> | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    
    await doc.update({
      $set: {
        ...data,
        updatedAt: new Date().toISOString()
      }
    });
    
    // Log the update
    const collectionName = this.collection.name;
    console.log(`[${new Date().toLocaleString()}] UPDATED: ${collectionName} - ID: ${id}`);
    
    return this.findById(id);
  }

  /**
   * Hard delete a document
   */
  async delete(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    if (!doc) return false;
    
    await doc.remove();
    
    // Log the hard delete
    const collectionName = this.collection.name;
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
    const collectionName = this.collection.name;
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
    return this.collection
      .find({
        selector: {
          $or: [
            { lastSyncedAt: { $exists: false } },
            { updatedAt: { $gt: { $field: 'lastSyncedAt' } } },
          ],
          isDeleted: { $ne: true },
          isLocalOnly: true
        }
      })
      .exec();
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
