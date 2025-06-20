import { RxDocument } from 'rxdb';
import { BaseRepository } from './BaseRepository';
import { RackDocType, RackDocument, RackCollection } from '../schemas/rack';

/**
 * Repository for rack-related database operations
 */
export class RackRepository extends BaseRepository<RackDocType, RackCollection> {
  constructor(collection: RackCollection) {
    super(collection);
    this.idPrefix = 'rack_';
  }

  /**
   * Find a rack by rack number
   */
  async findByRackNumber(rackNumber: string): Promise<RackDocument | null> {
    const results = await this.collection.find({
      selector: {
        rackNumber,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as RackDocument : null;
  }

  /**
   * Check if a rack exists by rack number (excluding a specific ID)
   */
  async existsByRackNumber(rackNumber: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      rackNumber,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Get all active racks
   */
  async getActiveRacks(): Promise<RackDocument[]> {
    const results = await this.collection.find({
      selector: {
        isActive: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as RackDocument[];
  }

  /**
   * Get all inactive racks
   */
  async getInactiveRacks(): Promise<RackDocument[]> {
    const results = await this.collection.find({
      selector: {
        isActive: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as RackDocument[];
  }

  /**
   * Search racks by rack number or description
   */
  async search(searchTerm: string): Promise<RackDocument[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.findAll();
    }
    
    const searchPattern = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape regex special chars
    
    const results = await this.collection.find({
      selector: {
        $and: [
          { isDeleted: { $ne: true } },
          {
            $or: [
              { rackNumber: { $regex: `(?i)${searchPattern}` } },
              { description: { $regex: `(?i)${searchPattern}` } },
              { location: { $regex: `(?i)${searchPattern}` } }
            ]
          }
        ]
      }
    }).exec();
    
    return results as RackDocument[];
  }

  /**
   * Get all racks for a specific business
   */
  async findByBusinessId(businessId: string): Promise<RackDocument[]> {
    const results = await this.collection.find({
      selector: {
        businessId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as RackDocument[];
  }

  /**
   * Get all racks that are marked as local only
   */
  async getLocalOnly(): Promise<RackDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as RackDocument[];
  }

  /**
   * Get all racks that are synced with the server
   */
  async getSynced(): Promise<RackDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as RackDocument[];
  }

  /**
   * Count all non-deleted racks
   */
  async count(): Promise<number> {
    return await this.collection.count({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  /**
   * Update rack load (increment or decrement)
   */
  async updateLoad(rackId: string, increment: number): Promise<RackDocument | null> {
    const rack = await this.findById(rackId);
    if (!rack) {
      return null;
    }
    
    const currentLoad = rack.currentLoad || 0;
    const newLoad = Math.max(0, currentLoad + increment);
    
    return this.update(rackId, {
      currentLoad: newLoad,
      updatedAt: new Date().toISOString()
    }) as Promise<RackDocument | null>;
  }

  /**
   * Check if rack has available capacity
   */
  async hasCapacity(rackId: string, requiredCapacity: number = 1): Promise<boolean> {
    const rack = await this.findById(rackId);
    if (!rack || !rack.isActive) {
      return false;
    }
    
    // If no capacity limit is set, rack has unlimited capacity
    if (!rack.capacity) {
      return true;
    }
    
    const currentLoad = rack.currentLoad || 0;
    return (rack.capacity - currentLoad) >= requiredCapacity;
  }

  /**
   * Mark a rack as synced with the server
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<RackDocument | null> {
    const rack = await this.findById(localId);
    if (!rack) {
      return null;
    }
    
    const updates: Partial<RackDocType> = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updates.amplifyId = amplifyId;
    }
    
    return this.update(localId, updates) as Promise<RackDocument | null>;
  }

  /**
   * Search for racks by rack number, location, or description
   */
  async search(searchTerm: string): Promise<RackDocument[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    // Escape special regex characters
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const results = await this.collection.find({
      selector: {
        isDeleted: { $ne: true },
        $or: [
          { rackNumber: { $regex: escapedSearchTerm, $options: 'i' } },
          { location: { $regex: escapedSearchTerm, $options: 'i' } },
          { description: { $regex: escapedSearchTerm, $options: 'i' } }
        ]
      }
    }).exec();
    
    return results as RackDocument[];
  }

  /**
   * Subscribe to changes in the racks collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
}