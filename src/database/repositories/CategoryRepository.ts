import { RxDocument } from 'rxdb';
import { BaseRepository } from './BaseRepository';
import { CategoryDocType, CategoryDocument, CategoryCollection } from '../schemas/category';

/**
 * Repository for category-related database operations
 */
export class CategoryRepository extends BaseRepository<CategoryDocType, CategoryCollection> {
  constructor(collection: CategoryCollection) {
    super(collection);
    this.idPrefix = 'category_';
  }

  /**
   * Find a category by name
   */
  async findByName(name: string): Promise<CategoryDocument | null> {
    const results = await this.collection.find({
      selector: {
        name,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as CategoryDocument : null;
  }

  /**
   * Search categories by name
   */
  async searchByName(searchTerm: string): Promise<CategoryDocument[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    const searchPattern = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    const results = await this.collection.find({
      selector: {
        $and: [
          { isDeleted: { $ne: true } },
          { name: { $regex: `(?i)${searchPattern}` } }
        ]
      }
    }).exec();
    
    return results as CategoryDocument[];
  }

  /**
   * Get all categories that are marked as local only
   */
  async getLocalOnly(): Promise<CategoryDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CategoryDocument[];
  }

  /**
   * Get all categories that are synced with the server
   */
  async getSynced(): Promise<CategoryDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CategoryDocument[];
  }

  /**
   * Count all non-deleted categories
   */
  async count(): Promise<number> {
    return await this.collection.count({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  /**
   * Bulk upsert categories
   */
  async bulkUpsert(categories: Partial<CategoryDocType>[]): Promise<void> {
    for (const category of categories) {
      if (category.id) {
        const existing = await this.findById(category.id);
        if (existing) {
          await existing.update({ $set: category });
          continue;
        }
      }
      await this.collection.insert(category as CategoryDocType);
    }
  }

  /**
   * Check if category exists by name (excluding a specific ID)
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      name,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Search categories across multiple fields
   */
  async search(query: string, limit?: number): Promise<CategoryDocument[]> {
    if (!query || query.trim() === '') {
      return this.findAll();
    }

    // Get all non-deleted categories first
    const allCategories = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();

    // Perform in-memory search
    const searchTerm = query.toLowerCase().trim();
    
    const filteredCategories = allCategories.filter(category => {
      const name = category.name?.toLowerCase() || '';
      const description = category.description?.toLowerCase() || '';
      
      return (
        name.includes(searchTerm) ||
        description.includes(searchTerm)
      );
    });

    // Apply limit if specified
    const results = limit ? filteredCategories.slice(0, limit) : filteredCategories;
    
    return results as CategoryDocument[];
  }

  /**
   * Subscribe to changes in the categories collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
  
  /**
   * Find categories by business ID
   */
  async findByBusinessId(businessId: string): Promise<CategoryDocument[]> {
    const results = await this.collection.find({
      selector: {
        businessId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as CategoryDocument[];
  }

  /**
   * Mark a category as synced with the server
   * @param localId Local category ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated category document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<CategoryDocument | null> {
    const category = await this.findById(localId);
    if (!category) {
      return null;
    }
    
    const updates: Partial<CategoryDocType> = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updates.amplifyId = amplifyId;
    }
    
    return this.update(localId, updates) as Promise<CategoryDocument | null>;
  }

  /**
   * Get categories ordered by name
   */
  async findAllOrdered(): Promise<CategoryDocument[]> {
    const results = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      },
      sort: [{ name: 'asc' }]
    }).exec();
    return results as CategoryDocument[];
  }
}