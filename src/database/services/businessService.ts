import { RxDatabase } from 'rxdb';
import { BusinessRepository } from '../repositories/BusinessRepository';
import { BusinessDocument, BusinessDocType } from '../schemas/business';
import { BusinessFormData, BusinessValidationErrors, validateBusinessForm } from '../../utils/businessValidation';
import { getDatabaseInstance, DatabaseCollections } from '../config';

export interface BusinessCreateResult {
  business?: BusinessDocument;
  errors?: BusinessValidationErrors;
  duplicateError?: string;
}

export interface BusinessUpdateResult {
  business?: BusinessDocument;
  errors?: BusinessValidationErrors;
}

export class BusinessService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private businessRepository: BusinessRepository | null = null;

  async initialize(): Promise<void> {
    if (!this.db) {
      try {
        this.db = await getDatabaseInstance();
        this.businessRepository = new BusinessRepository(this.db.businesses);
      } catch (error) {
        console.error('Failed to initialize BusinessService:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
  }

  async createBusiness(businessData: BusinessFormData): Promise<BusinessCreateResult> {
    try {
      await this.initialize();

      const validationErrors = validateBusinessForm(businessData);
      if (Object.keys(validationErrors).length > 0) {
        return { errors: validationErrors };
      }

      const existingBusiness = await this.businessRepository!.getBusinessByName(businessData.name);
      if (existingBusiness) {
        return { duplicateError: `Business with name "${businessData.name}" already exists` };
      }


      const docData: Omit<BusinessDocType, 'id' | 'createdAt' | 'updatedAt'> = {
        name: businessData.name.trim(),
        address: businessData.address?.trim() || undefined,
        city: businessData.city?.trim() || undefined,
        state: businessData.state?.trim() || undefined,
        zipCode: businessData.zipCode?.trim() || undefined,
        phone: businessData.phone.trim(),
        email: undefined, // Will be set to user email during sync
        taxId: businessData.taxId?.trim() || undefined,
        website: businessData.website?.trim() || undefined,
        isLocalOnly: (businessData as any).isLocalOnly !== undefined ? (businessData as any).isLocalOnly : true,
        isDeleted: false
      };

      const business = await this.businessRepository!.createBusiness(docData);
      return { business };

    } catch (error) {
      console.error('Error creating business:', error);
      return { errors: { name: 'Failed to create business. Please try again.' } };
    }
  }

  async updateBusiness(id: string, businessData: BusinessFormData): Promise<BusinessUpdateResult> {
    try {
      await this.initialize();

      const validationErrors = validateBusinessForm(businessData);
      if (Object.keys(validationErrors).length > 0) {
        return { errors: validationErrors };
      }

      const existingBusiness = await this.businessRepository!.getBusinessById(id);
      if (!existingBusiness) {
        return { errors: { name: 'Business not found' } };
      }

      if (businessData.name !== existingBusiness.name) {
        const duplicateBusiness = await this.businessRepository!.getBusinessByName(businessData.name);
        if (duplicateBusiness && duplicateBusiness.id !== id) {
          return { errors: { name: `Business with name "${businessData.name}" already exists` } };
        }
      }


      const updates: Partial<BusinessDocType> = {
        name: businessData.name.trim(),
        address: businessData.address?.trim() || undefined,
        city: businessData.city?.trim() || undefined,
        state: businessData.state?.trim() || undefined,
        zipCode: businessData.zipCode?.trim() || undefined,
        phone: businessData.phone.trim(),
        taxId: businessData.taxId?.trim() || undefined,
        website: businessData.website?.trim() || undefined,
        isLocalOnly: (businessData as any).isLocalOnly !== undefined ? (businessData as any).isLocalOnly : true,
        version: (existingBusiness.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      const business = await this.businessRepository!.updateBusiness(id, updates);
      return business ? { business } : { errors: { name: 'Failed to update business' } };

    } catch (error) {
      console.error('Error updating business:', error);
      return { errors: { name: 'Failed to update business. Please try again.' } };
    }
  }

  async deleteBusiness(id: string): Promise<boolean> {
    try {
      await this.initialize();
      return await this.businessRepository!.deleteBusiness(id);
    } catch (error) {
      console.error('Error deleting business:', error);
      return false;
    }
  }

  async getBusinessById(id: string): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      return await this.businessRepository!.getBusinessById(id);
    } catch (error) {
      console.error('Error getting business by ID:', error);
      return null;
    }
  }

  async getAllBusinesses(): Promise<BusinessDocument[]> {
    try {
      await this.initialize();
      return await this.businessRepository!.getAllBusinesses();
    } catch (error) {
      console.error('Error getting all businesses:', error);
      return [];
    }
  }

  async updateBusinessField(id: string, updates: Partial<BusinessDocType>): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      const existingBusiness = await this.businessRepository!.getBusinessById(id);
      if (!existingBusiness) {
        return null;
      }

      const updatedData = {
        ...updates,
        version: (existingBusiness.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      return await this.businessRepository!.updateBusiness(id, updatedData);
    } catch (error) {
      console.error('Error updating business field:', error);
      return null;
    }
  }

  async getActiveBusinesses(): Promise<BusinessDocument[]> {
    try {
      await this.initialize();
      return await this.businessRepository!.getActiveBusinesses();
    } catch (error) {
      console.error('Error getting active businesses:', error);
      return [];
    }
  }

  async searchBusinesses(searchTerm: string): Promise<BusinessDocument[]> {
    try {
      await this.initialize();
      return await this.businessRepository!.searchBusinesses(searchTerm);
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }

  /**
   * Get all businesses that haven't been synced with the server
   * @param forceRefresh Whether to force a refresh of cached data
   * @returns Array of unsynced business documents
   */
  async getUnsyncedBusinesses(forceRefresh = false): Promise<BusinessDocument[]> {
    try {
      await this.initialize();
      const repository = this.businessRepository!;
      return repository.findUnsyncedDocuments(forceRefresh) as Promise<BusinessDocument[]>;
    } catch (error) {
      console.error('Error getting unsynced businesses:', error);
      return [];
    }
  }

  async markBusinessSynced(id: string, amplifyId: string): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      return await this.businessRepository!.markSynced(id, amplifyId);
    } catch (error) {
      console.error('Error marking business as synced:', error);
      return null;
    }
  }

  async markBusinessUnsynced(id: string): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      return await this.businessRepository!.markUnsynced(id);
    } catch (error) {
      console.error('Error marking business as unsynced:', error);
      return null;
    }
  }

  async getBusinessByAmplifyId(amplifyId: string): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      return await this.businessRepository!.getBusinessByAmplifyId(amplifyId);
    } catch (error) {
      console.error('Error getting business by Amplify ID:', error);
      return null;
    }
  }

  async forceBusinessResync(id: string): Promise<BusinessDocument | null> {
    try {
      await this.initialize();
      console.log(`[BUSINESS SERVICE] Forcing resync for business ID: ${id}`);
      return await this.businessRepository!.markUnsynced(id);
    } catch (error) {
      console.error('Error forcing business resync:', error);
      return null;
    }
  }

}

export const businessService = new BusinessService();