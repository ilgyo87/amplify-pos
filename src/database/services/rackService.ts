import { RxDatabase } from 'rxdb';
import { RackDocument, RackDocType } from '../schemas/rack';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { RackRepository } from '../repositories/RackRepository';

/**
 * Validation errors for rack forms
 */
export interface RackValidationErrors {
  rackNumber?: string;
  description?: string;
  location?: string;
  capacity?: string;
}

/**
 * Rack form data interface
 */
export interface RackFormData {
  rackNumber: string;
  description?: string;
  location?: string;
  isActive?: boolean;
  capacity?: number;
}

/**
 * Service for handling rack-related business logic
 */
export class RackService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private rackRepository: RackRepository | null = null;

  /**
   * Initialize the service and database connection
   */
  public async initialize(): Promise<void> {
    if (!this.db) {
      try {
        this.db = await getDatabaseInstance();
        this.rackRepository = new RackRepository(this.db.racks);
      } catch (error) {
        console.error('Failed to initialize RackService:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
  }
  
  /**
   * Get the rack repository instance
   * @throws {Error} If repository is not initialized
   */
  private getRepository(): RackRepository {
    if (!this.rackRepository) {
      throw new Error('Rack repository not initialized');
    }
    return this.rackRepository;
  }

  /**
   * Validate rack form data
   */
  private validateRackForm(rackData: RackFormData): RackValidationErrors {
    const errors: RackValidationErrors = {};

    // Rack number is required
    if (!rackData.rackNumber || rackData.rackNumber.trim() === '') {
      errors.rackNumber = 'Rack number is required';
    } else if (rackData.rackNumber.length > 50) {
      errors.rackNumber = 'Rack number must be 50 characters or less';
    }

    // Description validation
    if (rackData.description && rackData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    // Location validation
    if (rackData.location && rackData.location.length > 200) {
      errors.location = 'Location must be 200 characters or less';
    }

    // Capacity validation
    if (rackData.capacity !== undefined) {
      if (rackData.capacity < 0) {
        errors.capacity = 'Capacity must be a positive number';
      } else if (rackData.capacity > 9999) {
        errors.capacity = 'Capacity must be less than 10,000';
      }
    }

    return errors;
  }

  /**
   * Create a new rack with validation
   */
  async createRack(
    rackData: RackFormData
  ): Promise<{ rack?: RackDocument; errors?: RackValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = this.validateRackForm(rackData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicate rack number
    const isDuplicate = await repository.existsByRackNumber(rackData.rackNumber);
    if (isDuplicate) {
      return { duplicateError: 'A rack with this number already exists' };
    }

    // Get a valid businessId for the rack
    let businessId = '';
    try {
      const { businessService } = await import('./businessService');
      await businessService.initialize();
      const businesses = await businessService.getAllBusinesses();
      if (businesses.length > 0) {
        businessId = businesses[0].id;
      }
    } catch (error) {
      console.error('Error getting business for new rack:', error);
    }

    // Set default values for new racks
    const rackWithDefaults = {
      ...rackData,
      businessId,
      isActive: rackData.isActive !== undefined ? rackData.isActive : true,
      currentLoad: 0,
      isLocalOnly: true,
      isDeleted: false
    };
    
    const rack = await repository.create(rackWithDefaults) as RackDocument;
    return { rack };
  }

  /**
   * Get a rack by ID
   */
  async getRackById(id: string): Promise<RackDocument | null> {
    const repository = this.getRepository();
    return repository.findById(id) as Promise<RackDocument | null>;
  }

  /**
   * Get a rack by rack number
   */
  async getRackByNumber(rackNumber: string): Promise<RackDocument | null> {
    const repository = this.getRepository();
    return repository.findByRackNumber(rackNumber);
  }

  /**
   * Check if a rack exists by rack number
   */
  async rackExists(rackNumber: string): Promise<boolean> {
    const repository = this.getRepository();
    return repository.existsByRackNumber(rackNumber);
  }

  /**
   * Get all racks
   */
  async getAllRacks(): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.findAll() as Promise<RackDocument[]>;
  }

  /**
   * Get all active racks
   */
  async getActiveRacks(): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.getActiveRacks();
  }

  /**
   * Update an existing rack with validation
   */
  async updateRack(
    id: string, 
    rackData: RackFormData
  ): Promise<{ rack?: RackDocument; errors?: RackValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = this.validateRackForm(rackData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicate rack number (excluding current rack)
    const isDuplicate = await repository.existsByRackNumber(rackData.rackNumber, id);
    if (isDuplicate) {
      return { duplicateError: 'A rack with this number already exists' };
    }

    // Get existing rack to access current version
    const existingRack = await repository.findById(id);
    if (!existingRack) {
      return { errors: { rackNumber: 'Rack not found' } };
    }

    const updateData = {
      ...rackData,
      version: (existingRack.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    const rack = await repository.update(id, updateData) as RackDocument | null;
    return { rack: rack || undefined };
  }

  /**
   * Delete a rack by ID (soft delete)
   */
  async deleteRack(id: string): Promise<boolean> {
    const repository = this.getRepository();
    return repository.softDelete(id);
  }

  /**
   * Toggle rack active status
   */
  async toggleRackStatus(id: string): Promise<RackDocument | null> {
    const repository = this.getRepository();
    const rack = await repository.findById(id);
    if (!rack) {
      return null;
    }

    return repository.update(id, {
      isActive: !rack.isActive,
      updatedAt: new Date().toISOString()
    }) as Promise<RackDocument | null>;
  }

  /**
   * Search for racks
   */
  async searchRacks(searchTerm: string): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.search(searchTerm);
  }

  /**
   * Get local only racks
   */
  async getLocalOnlyRacks(): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced racks
   */
  async getSyncedRacks(): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Get all racks that haven't been synced with the server
   */
  async getUnsyncedRacks(forceRefresh = false): Promise<RackDocument[]> {
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments(forceRefresh) as Promise<RackDocument[]>;
  }

  /**
   * Mark a rack as synced with the server
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<RackDocument | null> {
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId);
  }

  /**
   * Get the total count of racks
   */
  async getRacksCount(): Promise<number> {
    const repository = this.getRepository();
    return repository.count();
  }

  /**
   * Update rack load when an order is assigned
   */
  async incrementRackLoad(rackId: string, amount: number = 1): Promise<RackDocument | null> {
    const repository = this.getRepository();
    return repository.updateLoad(rackId, amount);
  }

  /**
   * Update rack load when an order is removed
   */
  async decrementRackLoad(rackId: string, amount: number = 1): Promise<RackDocument | null> {
    const repository = this.getRepository();
    return repository.updateLoad(rackId, -amount);
  }

  /**
   * Check if rack has available capacity
   */
  async hasCapacity(rackId: string, requiredCapacity: number = 1): Promise<boolean> {
    const repository = this.getRepository();
    return repository.hasCapacity(rackId, requiredCapacity);
  }

  /**
   * Subscribe to changes in the racks collection
   */
  subscribeToChanges(callback: (racks: RackDocument[]) => void): any {
    if (!this.rackRepository) {
      console.error('Rack repository not initialized');
      return { unsubscribe: () => {} };
    }
    
    // Subscribe to raw changes and fetch all racks when changes occur
    const unsubscribe = this.rackRepository.subscribeToChanges(async () => {
      try {
        const allRacks = await this.getAllRacks();
        callback(allRacks);
      } catch (error) {
        console.error('Error fetching racks in subscription:', error);
        callback([]);
      }
    });
    
    // Return subscription-like object
    return {
      unsubscribe
    };
  }

  /**
   * Subscribe to changes for a specific rack
   */
  subscribeToRackChanges(rackId: string, callback: (rack: RackDocument | null) => void): () => void {
    if (!this.rackRepository) {
      console.error('Rack repository not initialized');
      return () => {};
    }

    return this.rackRepository.subscribeToChanges(async (change: any) => {
      if (change.documentId === rackId || 
          (change.documentData && change.documentData.id === rackId)) {
        try {
          const updatedRack = await this.getRackById(rackId);
          callback(updatedRack);
        } catch (error) {
          console.error('Error fetching updated rack:', error);
          callback(null);
        }
      }
    });
  }

  /**
   * Bulk upsert racks
   */
  async bulkUpsert(racks: Array<Partial<RackDocType> & { id: string }>): Promise<void> {
    if (!racks.length) return;
    
    const repository = this.getRepository();
    
    // Process in chunks to avoid overloading the database
    const CHUNK_SIZE = 50;
    for (let i = 0; i < racks.length; i += CHUNK_SIZE) {
      const chunk = racks.slice(i, i + CHUNK_SIZE);
      await repository.bulkUpsert(chunk);
    }
  }
}

export const rackService = new RackService();