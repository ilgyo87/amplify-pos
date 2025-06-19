import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Business } from '../../../types/business';
import { Business as GraphQLBusiness } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';

export class BusinessSyncService extends BaseSyncService<Business> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log('[SYNC] Starting business sync...');
    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      const localBusinesses = await this.db.businesses
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localBusinesses.length;
      console.log(`[SYNC] Found ${stats.total} businesses to sync`);

      for (const localBusiness of localBusinesses) {
        try {
          await this.syncBusiness(localBusiness);
          stats.synced++;
        } catch (error) {
          console.error('[SYNC] Failed to sync business:', error);
          stats.failed++;
          this.errors.push(`Business ${localBusiness.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await this.downloadBusinesses(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
      };
    } catch (error) {
      console.error('[SYNC] Business sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncBusiness(localBusiness: any): Promise<void> {
    const businessData = localBusiness.toJSON();
    
    // Get current user's email and ID
    let userEmail = 'noemail@example.com';
    let userId = null;
    try {
      const user = await getCurrentUser();
      userEmail = user.signInDetails?.loginId || userEmail;
      userId = user.userId || user.username;  // Get the Cognito user ID
    } catch (error) {
      console.log('[SYNC] Could not get user info, using defaults');
    }
    
    // Map local fields to backend fields - include ALL fields!
    const input = {
      id: businessData.id,
      businessName: businessData.name || 'Unnamed Business',  // Required field
      firstName: businessData.firstName || null,
      lastName: businessData.lastName || null,
      address: businessData.address || null,
      city: businessData.city || null,
      state: businessData.state || null,
      zipCode: businessData.zipCode || null,
      phone: businessData.phone || '0000000000',  // Required field
      email: businessData.email || userEmail,  // Required field - use user's email if not set
      website: businessData.website || null,
      hours: businessData.hours || null,
      logoUrl: businessData.logoUrl || null,
      logoSource: businessData.logoSource || null,
      userId: businessData.userId || userId,  // Use authenticated user's ID if not set
      taxRate: businessData.taxRate || null,
      currency: businessData.currency || null,
      timezone: businessData.timezone || null,
      isActive: businessData.isActive !== false,
      logo: businessData.logo || null,
      settings: businessData.settings ? JSON.stringify(businessData.settings) : null,
    };

    try {
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateBusiness($input: CreateBusinessInput!) {
            createBusiness(input: $input) {
              id
              businessName
              firstName
              lastName
              address
              city
              state
              zipCode
              phone
              email
              website
              hours
              logoUrl
              logoSource
              userId
              taxRate
              currency
              timezone
              isActive
              logo
              settings
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateBusiness');
      if (data) {
        await localBusiness.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Business created:', businessData.id);
      }
    } catch (createError: any) {
      if (createError?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
        console.log('[SYNC] Business exists, attempting update:', businessData.id);
        
        const updateResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation UpdateBusiness($input: UpdateBusinessInput!) {
              updateBusiness(input: $input) {
                id
                businessName
                firstName
                lastName
                address
                city
                state
                zipCode
                phone
                email
                website
                hours
                logoUrl
                logoSource
                userId
                taxRate
                currency
                timezone
                isActive
                logo
                settings
                createdAt
                updatedAt
                _version
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(updateResult, 'UpdateBusiness');
        if (data) {
          await localBusiness.update({ $set: { isLocalOnly: false } });
          console.log('[SYNC] Business updated:', businessData.id);
        }
      } else {
        throw createError;
      }
    }
  }

  private async downloadBusinesses(stats: SyncStats): Promise<void> {
    console.log('[SYNC] Starting business download...');
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListBusinesses($limit: Int) {
            listBusinesses(limit: $limit) {
              items {
                id
                businessName
                firstName
                lastName
                address
                city
                state
                zipCode
                phone
                email
                website
                hours
                logoUrl
                logoSource
                userId
                taxRate
                currency
                timezone
                isActive
                logo
                settings
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListBusinesses');
      console.log('[SYNC] ListBusinesses raw response:', JSON.stringify(data, null, 2));
      
      if (!(data as any)?.listBusinesses?.items) {
        console.log('[SYNC] No businesses found in response');
        return;
      }

      const cloudBusinesses = (data as any).listBusinesses.items.filter(Boolean) as GraphQLBusiness[];
      console.log(`[SYNC] Found ${cloudBusinesses.length} businesses in cloud`);

      for (const cloudBusiness of cloudBusinesses) {
        try {
          const exists = await this.db!.businesses.findOne(cloudBusiness.id).exec();
          
          if (!exists) {
            const businessData = this.cleanGraphQLData(cloudBusiness);
            // Business downloaded from cloud is not local-only
            businessData.isLocalOnly = false;
            
            // Map backend fields to local fields - backend has 'businessName', local has 'name'
            if (businessData.businessName) {
              businessData.name = businessData.businessName;
              delete businessData.businessName;
            }
            
            // Parse JSON fields
            if (businessData.settings && typeof businessData.settings === 'string') {
              try {
                businessData.settings = JSON.parse(businessData.settings);
              } catch {
                businessData.settings = null;
              }
            }
            
            if (businessData.hours && typeof businessData.hours === 'string') {
              try {
                businessData.hours = JSON.parse(businessData.hours);
              } catch {
                businessData.hours = null;
              }
            }
            
            // Ensure required fields are present
            if (!businessData.createdAt) {
              businessData.createdAt = cloudBusiness.createdAt || new Date().toISOString();
            }
            if (!businessData.updatedAt) {
              businessData.updatedAt = cloudBusiness.updatedAt || new Date().toISOString();
            }
            
            console.log('[SYNC] Inserting business data:', businessData);
            await this.db!.businesses.insert(businessData);
            console.log('[SYNC] Downloaded new business:', cloudBusiness.id);
          }
        } catch (error) {
          console.error('[SYNC] Failed to download business:', error);
          console.error('[SYNC] Business data that failed:', cloudBusiness);
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to download businesses:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}