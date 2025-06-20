import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Category } from '../../../types/product';
import { Category as GraphQLCategory } from '../../../API';
import { SyncNotificationBuilder } from './SyncNotification';

export interface CategoryConflict {
  localCategory: Category;
  cloudCategory: GraphQLCategory;
  type: 'duplicate' | 'version';
  resolution?: 'keep-local' | 'keep-cloud';
}

export class CategorySyncService extends BaseSyncService<Category> {
  private conflicts: CategoryConflict[] = [];
  
  getConflicts(): CategoryConflict[] {
    return this.conflicts;
  }
  
  clearConflicts(): void {
    this.conflicts = [];
  }
  
  async resolveConflicts(resolutions: Array<{categoryId: string, resolution: 'keep-local' | 'keep-cloud'}>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    for (const { categoryId, resolution } of resolutions) {
      const conflict = this.conflicts.find(c => c.localCategory.id === categoryId);
      if (!conflict) continue;
      
      if (resolution === 'keep-cloud') {
        try {
          // Delete local category
          const localCategory = await this.db.categories.findOne(categoryId).exec();
          if (localCategory) {
            await localCategory.remove();
          }
          
          // Insert cloud category
          const categoryData = this.cleanGraphQLData(conflict.cloudCategory);
          categoryData.isLocalOnly = false;
          categoryData.amplifyId = conflict.cloudCategory.id; // Store the Amplify ID
          
          // Ensure required fields
          if (!categoryData.color) categoryData.color = '#007AFF';
          if (!categoryData.createdAt) categoryData.createdAt = conflict.cloudCategory.createdAt || new Date().toISOString();
          if (!categoryData.updatedAt) categoryData.updatedAt = conflict.cloudCategory.updatedAt || new Date().toISOString();
          
          await this.db.categories.insert(categoryData);
          console.log(`[SYNC] Replaced local category "${conflict.localCategory.name}" with cloud version`);
        } catch (error) {
          console.error(`[SYNC] Failed to resolve conflict for category ${categoryId}:`, error);
        }
      }
    }
    
    // Clear resolved conflicts
    this.clearConflicts();
  }
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];
    this.notificationBuilder = new SyncNotificationBuilder();

    try {
      // Get both new/updated categories and deleted categories that need syncing
      const [localCategories, deletedCategories] = await Promise.all([
        this.db.categories
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
        this.db.categories
          .find({ 
            selector: { 
              isDeleted: true,
              amplifyId: { $ne: null }
            } 
          })
          .exec()
      ]);

      const allCategoriesToSync = [...localCategories, ...deletedCategories];
      stats.total = allCategoriesToSync.length;
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} categories to sync (${deletedCategories.length} deletions)`);
      }

      for (const localCategory of allCategoriesToSync) {
        try {
          await this.syncCategory(localCategory);
          stats.synced++;
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          console.error('[SYNC] Failed to sync category:', localCategory.id, errorMessage);
          stats.failed++;
          this.errors.push(`Category ${localCategory.id}: ${errorMessage}`);
        }
      }

      await this.downloadCategories(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Category sync failed:', error);
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

  private async syncCategory(localCategory: any): Promise<void> {
    const categoryData = localCategory.toJSON();
    
    // Check if this is a deletion
    if (categoryData.isDeleted && categoryData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteCategory($input: DeleteCategoryInput!) {
              deleteCategory(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: categoryData.amplifyId || categoryData.id 
            } 
          },
        });

        const data = await this.handleGraphQLResult(deleteResult, 'DeleteCategory');
        if (data) {
          // Remove the category from local database after successful deletion
          await localCategory.remove();
          console.log('[SYNC] Category deleted from cloud and removed locally:', categoryData.name || categoryData.id);
          this.notificationBuilder.addOperation(
            'categories',
            'categories',
            'deleted',
            'to-cloud',
            1,
            [categoryData.name || categoryData.id]
          );
        }
        return;
      } catch (error: any) {
        console.error('[SYNC] Failed to delete category from cloud:', categoryData.id, error);
        throw error;
      }
    }
    
    // Map local fields to backend fields for create/update
    const input = {
      id: categoryData.id,
      name: categoryData.name,
      description: categoryData.description || null,
      color: categoryData.color || null,
      isActive: categoryData.isActive !== false,
      businessId: categoryData.businessId || null,
      displayOrder: categoryData.displayOrder || 0,
      sortOrder: categoryData.sortOrder || 0,
      image: categoryData.image || null,
      icon: categoryData.icon || null,
      version: categoryData.version || 1,
    };

    try {
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateCategory($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              id
              name
              description
              color
              isActive
              businessId
              displayOrder
              sortOrder
              image
              icon
              version
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateCategory');
      if (data) {
        await localCategory.update({ $set: { 
          isLocalOnly: false,
          amplifyId: categoryData.id // Store the ID used in Amplify
        } });
        console.log('[SYNC] Category uploaded:', categoryData.name || categoryData.id);
        this.notificationBuilder.addOperation(
          'categories',
          'categories',
          'added',
          'to-cloud',
          1,
          [categoryData.name || categoryData.id]
        );
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      const errorType = createError?.errors?.[0]?.errorType;
      const errorMessage = createError?.errors?.[0]?.message;
      
      if (errorType === 'DynamoDB:ConditionalCheckFailedException' || 
          errorMessage?.includes('conditional request failed')) {
        
        // Category exists, just update it
        // Remove any fields that might cause issues
        delete input._version;
        delete input._lastChangedAt;
        delete input._deleted;
        
        try {
          const updateResult = await this.client.graphql({
            query: /* GraphQL */ `
              mutation UpdateCategory($input: UpdateCategoryInput!) {
                updateCategory(input: $input) {
                  id
                  name
                  description
                  color
                  isActive
                  businessId
                  displayOrder
                  sortOrder
                  image
                  icon
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateCategory');
          if (data) {
            await localCategory.update({ $set: { 
              isLocalOnly: false,
              amplifyId: categoryData.id // Store the ID used in Amplify
            } });
            console.log('[SYNC] Category updated:', categoryData.id, `(${categoryData.name})`);
            this.notificationBuilder.addOperation(
              'categories',
              'categories',
              'updated',
              'to-cloud',
              1,
              [categoryData.name || categoryData.id]
            );
          }
        } catch (updateError: any) {
          // If update also fails, log the specific error
          const updateErrorMessage = updateError?.errors?.[0]?.message || updateError?.message || 'Unknown update error';
          console.error('[SYNC] Category update failed:', categoryData.id, updateErrorMessage);
          throw updateError;
        }
      } else {
        console.error('[SYNC] Category sync failed:', categoryData.id, errorMessage || 'Unknown error');
        throw createError;
      }
    }
  }

  private async downloadCategories(stats: SyncStats): Promise<void> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListCategories($limit: Int) {
            listCategories(limit: $limit) {
              items {
                id
                name
                description
                image
                color
                icon
                displayOrder
                isActive
                businessId
                version
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListCategories');
      if (!(data as any)?.listCategories?.items) return;

      const cloudCategories = (data as any).listCategories.items.filter(Boolean) as GraphQLCategory[];
      let downloadedCount = 0;

      for (const cloudCategory of cloudCategories) {
        try {
          const exists = await this.db!.categories.findOne(cloudCategory.id).exec();
          
          if (exists) {
            // Category exists - check for version conflict
            const localVersion = exists.version || 1;
            const cloudVersion = cloudCategory.version || 1;
            
            // If both have been modified (version > 1) and versions differ, it's a conflict
            if (localVersion > 1 && cloudVersion > 1 && localVersion !== cloudVersion) {
              console.log(`[SYNC] Version conflict detected for category "${exists.name}": local v${localVersion} vs cloud v${cloudVersion}`);
              this.conflicts.push({
                localCategory: exists.toJSON(),
                cloudCategory: cloudCategory,
                type: 'version'
              });
              continue;
            }
            
            // If cloud version is newer, update local
            if (cloudVersion > localVersion) {
              const categoryData = this.cleanGraphQLData(cloudCategory);
              categoryData.isLocalOnly = false;
              categoryData.amplifyId = cloudCategory.id; // Store the Amplify ID
              
              await exists.update({ $set: categoryData });
              console.log(`[SYNC] Updated category "${categoryData.name}" from cloud (v${cloudVersion})`);
              this.notificationBuilder.addOperation(
                'categories',
                'categories',
                'updated',
                'from-cloud',
                1,
                [categoryData.name]
              );
              downloadedCount++;
            }
          } else {
            const categoryData = this.cleanGraphQLData(cloudCategory);
            // Category downloaded from cloud is not local-only
            categoryData.isLocalOnly = false;
            categoryData.amplifyId = cloudCategory.id; // Store the Amplify ID
            
            // Ensure required fields are present
            if (!categoryData.color) {
              categoryData.color = '#007AFF'; // Default color
            }
            if (!categoryData.createdAt) {
              categoryData.createdAt = cloudCategory.createdAt || new Date().toISOString();
            }
            if (!categoryData.updatedAt) {
              categoryData.updatedAt = cloudCategory.updatedAt || new Date().toISOString();
            }
            
            // Check for semantic duplicate (same name)
            const existingCategories = await this.db!.categories.find({
              selector: {
                name: categoryData.name,
                isDeleted: { $ne: true }
              }
            }).exec();
            
            if (existingCategories.length > 0) {
              // Check if this is a local-only category (likely from default data)
              const localCategory = existingCategories[0];
              if (localCategory.isLocalOnly) {
                console.log(`[SYNC] Found conflict: local category "${categoryData.name}" conflicts with cloud category`);
                this.conflicts.push({
                  localCategory: localCategory.toJSON(),
                  cloudCategory: cloudCategory,
                  type: 'duplicate'
                });
              } else {
                console.log(`[SYNC] Skipping duplicate category: ${categoryData.name}`);
              }
              continue;
            }
            
            await this.db!.categories.insert(categoryData);
            this.notificationBuilder.addOperation(
              'categories',
              'categories',
              'added',
              'from-cloud',
              1,
              [categoryData.name]
            );
            downloadedCount++;
          }
        } catch (error) {
          console.error('[SYNC] Failed to download category:', error);
          console.error('[SYNC] Category data that failed:', cloudCategory);
        }
      }
      
      if (downloadedCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadedCount} new categories from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download categories:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}