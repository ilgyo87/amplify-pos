import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Category } from '../../../types/product';
import { Category as GraphQLCategory } from '../../../API';

export class CategorySyncService extends BaseSyncService<Category> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      const localCategories = await this.db.categories
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localCategories.length;
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} categories to sync`);
      }

      for (const localCategory of localCategories) {
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
      };
    } catch (error) {
      console.error('[SYNC] Category sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncCategory(localCategory: any): Promise<void> {
    const categoryData = localCategory.toJSON();
    
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
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateCategory');
      if (data) {
        await localCategory.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Category uploaded:', categoryData.name || categoryData.id);
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
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateCategory');
          if (data) {
            await localCategory.update({ $set: { isLocalOnly: false } });
            console.log('[SYNC] Category updated:', categoryData.id, `(${categoryData.name})`);
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
          
          if (!exists) {
            const categoryData = this.cleanGraphQLData(cloudCategory);
            // Category downloaded from cloud is not local-only
            categoryData.isLocalOnly = false;
            
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
            
            await this.db!.categories.insert(categoryData);
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