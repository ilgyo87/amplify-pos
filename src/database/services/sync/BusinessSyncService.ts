import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Business } from '../../../types/business';
import { Business as GraphQLBusiness } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';
import { SyncNotificationBuilder } from './SyncNotification';

export class BusinessSyncService extends BaseSyncService<Business> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];
    this.notificationBuilder = new SyncNotificationBuilder();

    try {
      // Get both new/updated businesses and deleted businesses that need syncing
      const [localBusinesses, deletedBusinesses] = await Promise.all([
        this.db.businesses
          .find({ 
            selector: { 
              isLocalOnly: true,
              $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
              ]
            } 
          })
          .exec(),
        this.db.businesses
          .find({ 
            selector: { 
              isDeleted: true,
              amplifyId: { $ne: null }
            } 
          })
          .exec()
      ]);

      const allBusinessesToSync = [...localBusinesses, ...deletedBusinesses];
      stats.total = allBusinessesToSync.length;
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} businesses to sync (${deletedBusinesses.length} deletions)`);
      }

      for (const localBusiness of allBusinessesToSync) {
        try {
          await this.syncBusiness(localBusiness);
          stats.synced++;
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          console.error('[SYNC] Failed to sync business:', localBusiness.id, errorMessage);
          stats.failed++;
          this.errors.push(`Business ${localBusiness.id}: ${errorMessage}`);
        }
      }

      await this.downloadBusinesses(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Business sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.notificationBuilder.addError(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    }
  }

  private async syncBusiness(localBusiness: any): Promise<void> {
    const businessData = localBusiness.toJSON();
    
    // Check if this is a deletion
    if (businessData.isDeleted && businessData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteBusiness($input: DeleteBusinessInput!) {
              deleteBusiness(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: businessData.amplifyId || businessData.id 
            } 
          },
        });

        const data = await this.handleGraphQLResult(deleteResult, 'DeleteBusiness');
        if (data) {
          // Remove the business from local database after successful deletion
          await localBusiness.remove();
          console.log('[SYNC] Business deleted from cloud and removed locally:', businessData.name || businessData.id);
          this.notificationBuilder.addOperation(
            'businesses',
            'businesses',
            'deleted',
            'to-cloud',
            1,
            [businessData.name || businessData.id]
          );
        }
        return;
      } catch (error: any) {
        console.error('[SYNC] Failed to delete business from cloud:', businessData.id, error);
        throw error;
      }
    }
    
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
      version: businessData.version || 1,
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
              version
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateBusiness');
      if (data) {
        await localBusiness.update({ $set: { 
          isLocalOnly: false,
          amplifyId: businessData.id // Store the ID used in Amplify
        } });
        console.log('[SYNC] Business uploaded:', businessData.name || businessData.id);
        this.notificationBuilder.addOperation(
          'businesses',
          'businesses',
          'added',
          'to-cloud',
          1,
          [businessData.name || businessData.id]
        );
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      const errorType = createError?.errors?.[0]?.errorType;
      const errorMessage = createError?.errors?.[0]?.message;
      
      if (errorType === 'DynamoDB:ConditionalCheckFailedException' || 
          errorMessage?.includes('conditional request failed')) {
        
        // Business exists, just update it
        // Remove any fields that might cause issues
        delete input._version;
        delete input._lastChangedAt;
        delete input._deleted;
        
        try {
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
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateBusiness');
          if (data) {
            await localBusiness.update({ $set: { 
              isLocalOnly: false,
              amplifyId: businessData.id // Store the ID used in Amplify
            } });
            console.log('[SYNC] Business updated:', businessData.id, `(${businessData.name})`);
            this.notificationBuilder.addOperation(
              'businesses',
              'businesses',
              'updated',
              'to-cloud',
              1,
              [businessData.name || businessData.id]
            );
          }
        } catch (updateError: any) {
          // If update also fails, log the specific error
          const updateErrorMessage = updateError?.errors?.[0]?.message || updateError?.message || 'Unknown update error';
          console.error('[SYNC] Business update failed:', businessData.id, updateErrorMessage);
          throw updateError;
        }
      } else {
        console.error('[SYNC] Business sync failed:', businessData.id, errorMessage || 'Unknown error');
        throw createError;
      }
    }
  }

  private async downloadBusinesses(stats: SyncStats): Promise<void> {
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
                version
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListBusinesses');
      
      if (!(data as any)?.listBusinesses?.items) {
        return;
      }

      const cloudBusinesses = (data as any).listBusinesses.items.filter(Boolean) as GraphQLBusiness[];
      
      let downloadedCount = 0;
      for (const cloudBusiness of cloudBusinesses) {
        try {
          const exists = await this.db!.businesses.findOne(cloudBusiness.id).exec();
          
          if (!exists) {
            const businessData = this.cleanGraphQLData(cloudBusiness);
            // Business downloaded from cloud is not local-only
            businessData.isLocalOnly = false;
            businessData.amplifyId = cloudBusiness.id; // Store the Amplify ID
            
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
            
            await this.db!.businesses.insert(businessData);
            this.notificationBuilder.addOperation(
              'businesses',
              'businesses',
              'added',
              'from-cloud',
              1,
              [businessData.name || businessData.id]
            );
            downloadedCount++;
          }
        } catch (error) {
          console.error('[SYNC] Failed to download business:', error);
          console.error('[SYNC] Business data that failed:', cloudBusiness);
        }
      }
      
      if (downloadedCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadedCount} new businesses from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download businesses:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}