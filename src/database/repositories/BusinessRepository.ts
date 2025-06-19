import { BaseRepository } from './BaseRepository';
import { BusinessDocument, BusinessDocType, BusinessCollection } from '../schemas/business';

export class BusinessRepository extends BaseRepository<BusinessDocType, BusinessCollection> {
  constructor(collection: BusinessCollection) {
    super(collection);
    this.idPrefix = 'business_';
  }

  async getBusinessById(id: string): Promise<BusinessDocument | null> {
    return this.findById(id);
  }

  async getAllBusinesses(): Promise<BusinessDocument[]> {
    return this.findAll();
  }

  async getActiveBusinesses(): Promise<BusinessDocument[]> {
    const results = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as BusinessDocument[];
  }

  async getUnsyncedBusinesses(): Promise<BusinessDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as BusinessDocument[];
  }

  async createBusiness(businessData: Omit<BusinessDocType, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessDocument> {
    const now = new Date().toISOString();
    const docData: BusinessDocType = {
      ...businessData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };
    return this.create(docData);
  }

  async updateBusiness(id: string, updates: Partial<BusinessDocType>): Promise<BusinessDocument | null> {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.update(id, updatedData);
  }

  async deleteBusiness(id: string): Promise<boolean> {
    return this.softDelete(id);
  }

  async hardDeleteBusiness(id: string): Promise<boolean> {
    return this.delete(id);
  }

  async searchBusinesses(searchTerm: string): Promise<BusinessDocument[]> {
    if (!searchTerm.trim()) {
      return this.getActiveBusinesses();
    }

    // For RxDB/PouchDB, we use simple string matching instead of complex regex
    const allBusinesses = await this.getActiveBusinesses();
    const term = searchTerm.toLowerCase();
    
    return allBusinesses.filter(business => {
      return (
        (business.name && business.name.toLowerCase().includes(term)) ||
        (business.email && business.email.toLowerCase().includes(term)) ||
        (business.phone && business.phone.toLowerCase().includes(term)) ||
        (business.city && business.city.toLowerCase().includes(term))
      );
    });
  }

  async getBusinessByName(name: string): Promise<BusinessDocument | null> {
    // For case-insensitive comparison, get all businesses and filter in memory
    const allBusinesses = await this.getActiveBusinesses();
    return allBusinesses.find(business => 
      business.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  async getBusinessByEmail(email: string): Promise<BusinessDocument | null> {
    // For case-insensitive comparison, get all businesses and filter in memory
    const allBusinesses = await this.getActiveBusinesses();
    return allBusinesses.find(business => 
      business.email && business.email.toLowerCase() === email.toLowerCase()
    ) || null;
  }

  async markSynced(id: string, amplifyId: string): Promise<BusinessDocument | null> {
    return this.update(id, {
      isLocalOnly: false,
      amplifyId,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async markUnsynced(id: string): Promise<BusinessDocument | null> {
    return this.update(id, {
      isLocalOnly: true,
      updatedAt: new Date().toISOString()
    });
  }

  async getBusinessByAmplifyId(amplifyId: string): Promise<BusinessDocument | null> {
    if (!amplifyId) return null;
    
    const results = await this.collection.find({
      selector: {
        amplifyId,
        isDeleted: { $ne: true }
      }
    }).exec();
    
    return results.length > 0 ? results[0] as BusinessDocument : null;
  }
}