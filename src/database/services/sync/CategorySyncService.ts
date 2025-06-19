import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Category } from '../../../types/product';
import { Category as GraphQLCategory } from '../../../API';

export class CategorySyncService extends BaseSyncService<Category> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log('[SYNC] Starting category sync...');
    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      const localCategories = await this.db.categories
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localCategories.length;
      console.log(`[SYNC] Found ${stats.total} categories to sync`);

      for (const localCategory of localCategories) {
        try {
          await this.syncCategory(localCategory);
          stats.synced++;
        } catch (error) {
          console.error('[SYNC] Failed to sync category:', error);
          stats.failed++;
          this.errors.push(`Category ${localCategory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        console.log('[SYNC] Category created:', categoryData.id);
      }
    } catch (createError: any) {
      if (createError?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
        console.log('[SYNC] Category exists, attempting update:', categoryData.id);
        
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
                _version
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(updateResult, 'UpdateCategory');
        if (data) {
          await localCategory.update({ $set: { isLocalOnly: false } });
          console.log('[SYNC] Category updated:', categoryData.id);
        }
      } else {
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
      console.log(`[SYNC] Found ${cloudCategories.length} categories in cloud`);

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
            
            console.log('[SYNC] Inserting category data:', categoryData);
            await this.db!.categories.insert(categoryData);
            console.log('[SYNC] Downloaded new category:', cloudCategory.id);
          }
        } catch (error) {
          console.error('[SYNC] Failed to download category:', error);
          console.error('[SYNC] Category data that failed:', cloudCategory);
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to download categories:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}