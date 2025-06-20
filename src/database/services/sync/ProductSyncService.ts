import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Product } from '../../../types/product';
import { Product as GraphQLProduct } from '../../../API';

export class ProductSyncService extends BaseSyncService<Product> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      const localProducts = await this.db.products
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localProducts.length;
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} products to sync`);
      }

      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < localProducts.length; i += batchSize) {
        const batch = localProducts.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (product) => {
            try {
              await this.syncProduct(product);
              stats.synced++;
            } catch (error: any) {
              const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
              console.error('[SYNC] Failed to sync product:', product.id, errorMessage);
              stats.failed++;
              this.errors.push(`Product ${product.id}: ${errorMessage}`);
            }
          })
        );
        
        if (i + batchSize < localProducts.length) {
          await this.sleep(100);
        }
      }

      await this.downloadProducts(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
      };
    } catch (error) {
      console.error('[SYNC] Product sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncProduct(localProduct: any): Promise<void> {
    const productData = localProduct.toJSON();
    
    // Map local fields to backend fields
    const input = {
      id: productData.id,
      name: productData.name,
      description: productData.description || null,
      categoryId: productData.categoryId || null,
      price: productData.price,  // Map local 'price' to backend 'price'
      sku: productData.sku || null,
      barcode: productData.barcode || null,
      isActive: productData.isActive !== false,
      businessId: productData.businessId || null,
      imageUrl: productData.imageUrl || null,
      imageName: productData.imageName || null,
      image: productData.image || null,
      cost: productData.cost || null,
      quantity: productData.quantity || null,
      trackInventory: productData.trackInventory || false,
      inventoryCount: productData.inventoryCount || 0,
      lowStockThreshold: productData.lowStockThreshold || 0,
      variants: productData.variants ? JSON.stringify(productData.variants) : null,
      customizations: productData.customizations ? JSON.stringify(productData.customizations) : null,
      displayOrder: productData.displayOrder || 0,
    };

    try {
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateProduct($input: CreateProductInput!) {
            createProduct(input: $input) {
              id
              name
              description
              categoryId
              price
              sku
              barcode
              isActive
              businessId
              imageUrl
              imageName
              image
              cost
              quantity
              trackInventory
              inventoryCount
              lowStockThreshold
              variants
              customizations
              displayOrder
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateProduct');
      if (data) {
        await localProduct.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Product uploaded:', productData.name || productData.id);
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      const errorType = createError?.errors?.[0]?.errorType;
      const errorMessage = createError?.errors?.[0]?.message;
      
      if (errorType === 'DynamoDB:ConditionalCheckFailedException' || 
          errorMessage?.includes('conditional request failed')) {
        
        // Product exists, just update it
        // Remove any fields that might cause issues
        delete input._version;
        delete input._lastChangedAt;
        delete input._deleted;
        
        try {
          const updateResult = await this.client.graphql({
            query: /* GraphQL */ `
              mutation UpdateProduct($input: UpdateProductInput!) {
                updateProduct(input: $input) {
                  id
                  name
                  description
                  categoryId
                  price
                  sku
                  barcode
                  isActive
                  businessId
                  imageUrl
                  imageName
                  image
                  cost
                  quantity
                  trackInventory
                  inventoryCount
                  lowStockThreshold
                  variants
                  customizations
                  displayOrder
                        createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateProduct');
          if (data) {
            await localProduct.update({ $set: { isLocalOnly: false } });
            console.log('[SYNC] Product updated:', productData.id, `(${productData.name})`);
          }
        } catch (updateError: any) {
          // If update also fails, log the specific error
          const updateErrorMessage = updateError?.errors?.[0]?.message || updateError?.message || 'Unknown update error';
          console.error('[SYNC] Product update failed:', productData.id, updateErrorMessage);
          throw updateError;
        }
      } else {
        console.error('[SYNC] Product sync failed:', productData.id, errorMessage || 'Unknown error');
        throw createError;
      }
    }
  }

  private async downloadProducts(stats: SyncStats): Promise<void> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListProducts($limit: Int) {
            listProducts(limit: $limit) {
              items {
                id
                name
                description
                categoryId
                price
                sku
                barcode
                isActive
                businessId
                imageUrl
                imageName
                image
                cost
                quantity
                trackInventory
                inventoryCount
                lowStockThreshold
                variants
                customizations
                displayOrder
                      createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListProducts');
      
      if (!(data as any)?.listProducts?.items) {
        // No products in cloud
        return;
      }

      const cloudProducts = (data as any).listProducts.items.filter(Boolean) as GraphQLProduct[];
      let downloadedCount = 0;

      for (const cloudProduct of cloudProducts) {
        try {
          const exists = await this.db!.products.findOne(cloudProduct.id).exec();
          
          if (!exists) {
            const productData = this.cleanGraphQLData(cloudProduct);
            // Product downloaded from cloud is not local-only
            productData.isLocalOnly = false;
            
            // Backend 'price' field maps directly to local 'price' field
            // No field mapping needed as they use the same name
            
            // Parse JSON fields
            if (productData.variants && typeof productData.variants === 'string') {
              try {
                productData.variants = JSON.parse(productData.variants);
              } catch {
                productData.variants = [];
              }
            }
            
            if (productData.customizations && typeof productData.customizations === 'string') {
              try {
                productData.customizations = JSON.parse(productData.customizations);
              } catch {
                productData.customizations = [];
              }
            }
            
            // Ensure required fields are present
            if (!productData.categoryId) {
              productData.categoryId = 'uncategorized'; // Default category
            }
            if (!productData.price && productData.price !== 0) {
              productData.price = 0;
            }
            if (!productData.createdAt) {
              productData.createdAt = cloudProduct.createdAt || new Date().toISOString();
            }
            if (!productData.updatedAt) {
              productData.updatedAt = cloudProduct.updatedAt || new Date().toISOString();
            }
            
            await this.db!.products.insert(productData);
            downloadedCount++;
          }
        } catch (error) {
          console.error('[SYNC] Failed to download product:', error);
          console.error('[SYNC] Product data that failed:', cloudProduct);
        }
      }
      
      if (downloadedCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadedCount} new products from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download products:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}