import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { RackDocType } from '../../schemas/rack';
import { Rack as GraphQLRack } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';
import { SyncNotificationBuilder } from './SyncNotification';

export class RackSyncService extends BaseSyncService<RackDocType> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];
    this.notificationBuilder = new SyncNotificationBuilder();

    try {
      // Get both new/updated racks and deleted racks that need syncing
      const [localRacks, deletedRacks] = await Promise.all([
        this.db.racks
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
        this.db.racks
          .find({ 
            selector: { 
              isDeleted: true,
              amplifyId: { $ne: null }
            } 
          })
          .exec()
      ]);

      const allRacksToSync = [...localRacks, ...deletedRacks];
      stats.total = allRacksToSync.length;
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} racks to sync (${deletedRacks.length} deletions)`);
      }

      for (const localRack of allRacksToSync) {
        try {
          await this.syncRack(localRack);
          stats.synced++;
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          console.error('[SYNC] Failed to sync rack:', localRack.id, errorMessage);
          stats.failed++;
          this.errors.push(`Rack ${localRack.id}: ${errorMessage}`);
        }
      }

      // Download new racks from cloud
      await this.downloadRacks(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Rack sync failed:', error);
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

  private async syncRack(localRack: any): Promise<void> {
    const rackData = localRack.toJSON();
    
    // Check if this is a deletion
    if (rackData.isDeleted && rackData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteRack($input: DeleteRackInput!) {
              deleteRack(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: rackData.amplifyId || rackData.id 
            } 
          }
        });
        
        console.log('[SYNC] Deleted rack from cloud:', rackData.rackNumber);
        await localRack.remove();
        
        // Add to notification builder
        this.notificationBuilder.addOperation(
          'rack',
          rackData.rackNumber,
          'delete',
          'upload'
        );
      } catch (error: any) {
        console.error('[SYNC] Failed to delete rack from cloud:', error);
        throw error;
      }
      return;
    }
    
    try {
      const user = await getCurrentUser();
      const businessId = user.signInDetails?.loginId;
      
      if (!businessId) {
        console.error('[SYNC] No business ID found in user context');
        throw new Error('No business ID found');
      }

      // Create rack input
      const createInput = {
        rackNumber: rackData.rackNumber,
        description: rackData.description || null,
        location: rackData.location || null,
        isActive: rackData.isActive,
        capacity: rackData.capacity || null,
        currentLoad: rackData.currentLoad || 0,
        businessId,
        version: rackData.version || 1,
      };

      if (rackData.amplifyId) {
        // Update existing rack
        const updateResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation UpdateRack($input: UpdateRackInput!) {
              updateRack(input: $input) {
                id
                rackNumber
                description
                location
                isActive
                capacity
                currentLoad
                businessId
                version
                createdAt
                updatedAt
              }
            }
          `,
          variables: { 
            input: { 
              id: rackData.amplifyId,
              ...createInput
            } 
          }
        });

        // Mark as synced
        await localRack.update({ $set: { 
          isLocalOnly: false,
          lastSyncedAt: new Date().toISOString()
        } });
        
        // Add to notification builder
        this.notificationBuilder.addOperation(
          'rack',
          rackData.rackNumber,
          'update',
          'upload'
        );
      } else {
        // Create new rack
        const createResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation CreateRack($input: CreateRackInput!) {
              createRack(input: $input) {
                id
                rackNumber
                description
                location
                isActive
                capacity
                currentLoad
                businessId
                version
                createdAt
                updatedAt
              }
            }
          `,
          variables: { 
            input: createInput 
          }
        });

        const newRack = createResult.data.createRack;
        // Mark as synced
        await localRack.update({ $set: { 
          isLocalOnly: false,
          amplifyId: newRack.id,
          lastSyncedAt: new Date().toISOString()
        } });
        
        // Add to notification builder
        this.notificationBuilder.addOperation(
          'rack',
          rackData.rackNumber,
          'create',
          'upload'
        );
      }
    } catch (error: any) {
      if (error?.errors?.[0]?.errorType === 'DuplicateError') {
        console.log('[SYNC] Rack already exists in cloud, fetching...');
        await this.handleDuplicateRack(rackData);
      } else {
        throw error;
      }
    }
  }

  private async handleDuplicateRack(rackData: RackDocType): Promise<void> {
    try {
      const result = await this.client.graphql({
        query: /* GraphQL */ `
          query ListRacks($filter: ModelRackFilterInput) {
            listRacks(filter: $filter) {
              items {
                id
                rackNumber
                version
              }
            }
          }
        `,
        variables: {
          filter: {
            rackNumber: { eq: rackData.rackNumber }
          }
        }
      });

      const cloudRack = result.data.listRacks.items[0];
      if (cloudRack && this.db) {
        // Find the local rack and mark it as synced
        const localRack = await this.db.racks.findOne(rackData.id).exec();
        if (localRack) {
          await localRack.update({ $set: { 
            isLocalOnly: false,
            amplifyId: cloudRack.id,
            lastSyncedAt: new Date().toISOString()
          } });
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to handle duplicate rack:', error);
    }
  }

  private async downloadRacks(stats: SyncStats): Promise<void> {
    try {
      const user = await getCurrentUser();
      const businessId = user.signInDetails?.loginId;
      
      if (!businessId) {
        console.log('[SYNC] No business ID found, skipping rack download');
        return;
      }

      const result = await this.client.graphql({
        query: /* GraphQL */ `
          query ListRacks($filter: ModelRackFilterInput) {
            listRacks(filter: $filter, limit: 1000) {
              items {
                id
                rackNumber
                description
                location
                isActive
                capacity
                currentLoad
                businessId
                version
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: {
          filter: {
            businessId: { eq: businessId }
          }
        }
      });

      const cloudRacks = result.data.listRacks.items;
      let downloadCount = 0;

      for (const cloudRack of cloudRacks) {
        try {
          // Check if rack exists locally
          const existingRack = await this.db!.racks
            .findOne({
              selector: {
                $or: [
                  { amplifyId: cloudRack.id },
                  { rackNumber: cloudRack.rackNumber }
                ]
              }
            })
            .exec();

          if (!existingRack) {
            // Create new local rack
            await this.db!.racks.insert({
              id: `rack_${cloudRack.id}`,
              rackNumber: cloudRack.rackNumber,
              description: cloudRack.description || undefined,
              location: cloudRack.location || undefined,
              isActive: cloudRack.isActive ?? true,
              capacity: cloudRack.capacity || undefined,
              currentLoad: cloudRack.currentLoad || 0,
              businessId: cloudRack.businessId || undefined,
              amplifyId: cloudRack.id,
              version: cloudRack.version || 1,
              isLocalOnly: false,
              lastSyncedAt: new Date().toISOString(),
              createdAt: cloudRack.createdAt,
              updatedAt: cloudRack.updatedAt,
            });
            
            downloadCount++;
            
            // Add to notification builder
            this.notificationBuilder.addOperation(
              'rack',
              cloudRack.rackNumber,
              'create',
              'download',
              1,
              [{
                name: cloudRack.rackNumber,
                details: cloudRack.location || undefined
              }]
            );
          }
        } catch (error) {
          console.error('[SYNC] Failed to download rack:', cloudRack.id, error);
          stats.failed++;
        }
      }

      if (downloadCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadCount} new racks from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download racks:', error);
      this.errors.push('Failed to download racks from cloud');
    }
  }
}