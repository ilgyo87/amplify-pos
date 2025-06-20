import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Product } from '../../../types/product';
import { Product as GraphQLProduct } from '../../../API';
import { SyncNotificationBuilder } from './SyncNotification';

export interface ProductConflict {
  localProduct: Product;
  cloudProduct: GraphQLProduct;
  type: 'duplicate' | 'version';
  resolution?: 'keep-local' | 'keep-cloud';
}

export class ProductSyncService extends BaseSyncService<Product> {
  private conflicts: ProductConflict[] = [];
  
  getConflicts(): ProductConflict[] {
    return this.conflicts;
  }
  
  clearConflicts(): void {
    this.conflicts = [];
  }
  
  async resolveConflicts(resolutions: Array<{productId: string, resolution: 'keep-local' | 'keep-cloud'}>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    for (const { productId, resolution } of resolutions) {
      const conflict = this.conflicts.find(c => c.localProduct.id === productId);
      if (!conflict) continue;
      
      if (resolution === 'keep-cloud') {
        try {
          // Delete local product
          const localProduct = await this.db.products.findOne(productId).exec();
          if (localProduct) {
            await localProduct.remove();
          }
          
          // Insert cloud product
          const productData = this.cleanGraphQLData(conflict.cloudProduct);
          productData.isLocalOnly = false;
          
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
          
          // Ensure required fields
          if (!productData.categoryId) productData.categoryId = 'uncategorized';
          if (!productData.price && productData.price !== 0) productData.price = 0;
          if (!productData.createdAt) productData.createdAt = conflict.cloudProduct.createdAt || new Date().toISOString();
          if (!productData.updatedAt) productData.updatedAt = conflict.cloudProduct.updatedAt || new Date().toISOString();
          
          await this.db.products.insert(productData);
          console.log(`[SYNC] Replaced local product "${conflict.localProduct.name}" with cloud version`);
        } catch (error) {
          console.error(`[SYNC] Failed to resolve conflict for product ${productId}:`, error);
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
      // Get both new/updated products and deleted products that need syncing
      const [localProducts, deletedProducts] = await Promise.all([
        this.db.products
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
        this.db.products
          .find({ 
            selector: { 
              isDeleted: true,
              $and: [
                { amplifyId: { $exists: true } },
                { amplifyId: { $ne: null } },
                { amplifyId: { $ne: '' } }
              ]
            } 
          })
          .exec()
      ]);

      const allProductsToSync = [...localProducts, ...deletedProducts];
      stats.total = allProductsToSync.length;
      
      // Debug logging
      if (deletedProducts.length > 0) {
        console.log('[SYNC] Deleted products to sync:', deletedProducts.map(p => ({
          id: p.id,
          name: p.name,
          amplifyId: p.amplifyId,
          isDeleted: p.isDeleted,
          isLocalOnly: p.isLocalOnly
        })));
      }
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} products to sync (${deletedProducts.length} deletions)`);
      }

      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < allProductsToSync.length; i += batchSize) {
        const batch = allProductsToSync.slice(i, i + batchSize);
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
        
        if (i + batchSize < allProductsToSync.length) {
          await this.sleep(100);
        }
      }

      await this.downloadProducts(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Product sync failed:', error);
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

  private async syncProduct(localProduct: any): Promise<void> {
    const productData = localProduct.toJSON();
    
    // Check if this is a deletion
    if (productData.isDeleted && productData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteProduct($input: DeleteProductInput!) {
              deleteProduct(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: productData.amplifyId || productData.id 
            } 
          },
        });

        const data = await this.handleGraphQLResult(deleteResult, 'DeleteProduct');
        if (data) {
          // Remove the product from local database after successful deletion
          await localProduct.remove();
          console.log('[SYNC] Product deleted from cloud and removed locally:', productData.name || productData.id);
          this.notificationBuilder.addOperation(
            'products',
            'products',
            'deleted',
            'to-cloud',
            1,
            [productData.name || productData.id]
          );
        }
        return;
      } catch (error: any) {
        console.error('[SYNC] Failed to delete product from cloud:', productData.id, error);
        throw error;
      }
    }
    
    // Map local fields to backend fields for create/update
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
      version: productData.version || 1,
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
              version
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateProduct');
      if (data) {
        await localProduct.update({ $set: { 
          isLocalOnly: false,
          amplifyId: productData.id // Store the ID used in Amplify
        } });
        console.log('[SYNC] Product uploaded:', productData.name || productData.id);
        this.notificationBuilder.addOperation(
          'products',
          'products',
          'added',
          'to-cloud',
          1,
          [productData.name || productData.id]
        );
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
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateProduct');
          if (data) {
            await localProduct.update({ $set: { 
              isLocalOnly: false,
              amplifyId: productData.id // Store the ID used in Amplify
            } });
            console.log('[SYNC] Product updated:', productData.id, `(${productData.name})`);
            this.notificationBuilder.addOperation(
              'products',
              'products',
              'updated',
              'to-cloud',
              1,
              [productData.name || productData.id]
            );
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
                version
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
          // First check if product exists by ID
          const existsById = await this.db!.products.findOne(cloudProduct.id).exec();
          
          if (existsById) {
            // Product exists - check for version conflict
            const localVersion = existsById.version || 1;
            const cloudVersion = cloudProduct.version || 1;
            
            // If both have been modified (version > 1) and versions differ, it's a conflict
            if (localVersion > 1 && cloudVersion > 1 && localVersion !== cloudVersion) {
              console.log(`[SYNC] Version conflict detected for product "${existsById.name}": local v${localVersion} vs cloud v${cloudVersion}`);
              this.conflicts.push({
                localProduct: existsById.toJSON(),
                cloudProduct: cloudProduct,
                type: 'version'
              });
              continue;
            }
            
            // If cloud version is newer, update local
            if (cloudVersion > localVersion) {
              const productData = this.cleanGraphQLData(cloudProduct);
              productData.isLocalOnly = false;
              productData.amplifyId = cloudProduct.id; // Store the Amplify ID
              
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
              
              await existsById.update({ $set: productData });
              console.log(`[SYNC] Updated product "${productData.name}" from cloud (v${cloudVersion})`);
              this.notificationBuilder.addOperation(
                'products',
                'products',
                'updated',
                'from-cloud',
                1,
                [productData.name]
              );
              downloadedCount++;
            }
          } else {
            const productData = this.cleanGraphQLData(cloudProduct);
            // Product downloaded from cloud is not local-only
            productData.isLocalOnly = false;
            productData.amplifyId = cloudProduct.id; // Store the Amplify ID
            
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
            
            // Check for semantic duplicate (same name and category)
            const existingProducts = await this.db!.products.find({
              selector: {
                name: productData.name,
                categoryId: productData.categoryId,
                isDeleted: { $ne: true }
              }
            }).exec();
            
            if (existingProducts.length > 0) {
              // Check if this is a local-only product (likely from default data)
              const localProduct = existingProducts[0];
              if (localProduct.isLocalOnly) {
                console.log(`[SYNC] Found conflict: local product "${productData.name}" conflicts with cloud product`);
                this.conflicts.push({
                  localProduct: localProduct.toJSON(),
                  cloudProduct: cloudProduct,
                  type: 'duplicate'
                });
              } else {
                console.log(`[SYNC] Skipping duplicate product: ${productData.name} in category ${productData.categoryId}`);
              }
              continue;
            }
            
            await this.db!.products.insert(productData);
            this.notificationBuilder.addOperation(
              'products',
              'products',
              'added',
              'from-cloud',
              1,
              [productData.name]
            );
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