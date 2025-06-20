import { RxDocument } from 'rxdb';
import { BaseRepository } from './BaseRepository';
import { ProductDocType, ProductDocument, ProductCollection } from '../schemas/product';

/**
 * Repository for product-related database operations
 */
export class ProductRepository extends BaseRepository<ProductDocType, ProductCollection> {
  constructor(collection: ProductCollection) {
    super(collection);
    this.idPrefix = 'product_';
  }

  /**
   * Find products by category ID
   */
  async findByCategoryId(categoryId: string): Promise<ProductDocument[]> {
    const results = await this.collection.find({
      selector: {
        categoryId,
        isDeleted: { $ne: true }
      },
      sort: [{ name: 'asc' }]
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Find a product by name within a category
   */
  async findByNameInCategory(name: string, categoryId: string): Promise<ProductDocument | null> {
    const results = await this.collection.find({
      selector: {
        name,
        categoryId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results.length > 0 ? results[0] as ProductDocument : null;
  }

  /**
   * Search products by name
   */
  async searchByName(searchTerm: string, categoryId?: string): Promise<ProductDocument[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    const searchPattern = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    const selector: any = {
      $and: [
        { isDeleted: { $ne: true } },
        { name: { $regex: `(?i)${searchPattern}` } }
      ]
    };

    if (categoryId) {
      selector.$and.push({ categoryId });
    }
    
    const results = await this.collection.find({
      selector,
      sort: [{ name: 'asc' }]
    }).exec();
    
    return results as ProductDocument[];
  }

  /**
   * Find products by price range
   */
  async findByPriceRange(minPrice: number, maxPrice: number, categoryId?: string): Promise<ProductDocument[]> {
    const selector: any = {
      $and: [
        { isDeleted: { $ne: true } },
        { price: { $gte: minPrice, $lte: maxPrice } }
      ]
    };

    if (categoryId) {
      selector.$and.push({ categoryId });
    }

    const results = await this.collection.find({
      selector,
      sort: [{ price: 'asc' }]
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Get all products that are marked as local only
   */
  async getLocalOnly(): Promise<ProductDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: true,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Get all products that are synced with the server
   */
  async getSynced(): Promise<ProductDocument[]> {
    const results = await this.collection.find({
      selector: {
        isLocalOnly: false,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Count all non-deleted products
   */
  async count(): Promise<number> {
    return await this.collection.count({
      selector: {
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  /**
   * Count products in a specific category
   */
  async countByCategory(categoryId: string): Promise<number> {
    return await this.collection.count({
      selector: {
        categoryId,
        isDeleted: { $ne: true }
      }
    }).exec();
  }

  /**
   * Bulk upsert products
   */
  async bulkUpsert(products: Partial<ProductDocType>[]): Promise<void> {
    for (const product of products) {
      if (product.id) {
        const existing = await this.findById(product.id);
        if (existing) {
          await existing.update({ $set: product });
          continue;
        }
      }
      await this.collection.insert(product as ProductDocType);
    }
  }

  /**
   * Check if product exists by name in category (excluding a specific ID)
   */
  async existsByNameInCategory(name: string, categoryId: string, excludeId?: string): Promise<boolean> {
    const selector: any = {
      name,
      categoryId,
      isDeleted: { $ne: true }
    };
    
    if (excludeId) {
      selector.id = { $ne: excludeId };
    }
    
    const count = await this.collection.count({ selector }).exec();
    return count > 0;
  }

  /**
   * Search products across multiple fields
   */
  async search(query: string, categoryId?: string, limit?: number): Promise<ProductDocument[]> {
    if (!query || query.trim() === '') {
      if (categoryId) {
        return this.findByCategoryId(categoryId);
      }
      return this.findAll();
    }

    // Get products for search
    const selector: any = {
      isDeleted: { $ne: true }
    };

    if (categoryId) {
      selector.categoryId = categoryId;
    }

    const allProducts = await this.collection.find({ selector }).exec();

    // Perform in-memory search
    const searchTerm = query.toLowerCase().trim();
    
    const filteredProducts = allProducts.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      const notes = product.notes?.toLowerCase() || '';
      const priceString = product.price?.toString() || '';
      
      return (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        notes.includes(searchTerm) ||
        priceString.includes(searchTerm)
      );
    });

    // Apply limit if specified
    const results = limit ? filteredProducts.slice(0, limit) : filteredProducts;
    
    return results as ProductDocument[];
  }

  /**
   * Subscribe to changes in the products collection
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    const subscription = this.collection.$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
  
  /**
   * Find products by business ID
   */
  async findByBusinessId(businessId: string): Promise<ProductDocument[]> {
    const results = await this.collection.find({
      selector: {
        businessId,
        isDeleted: { $ne: true }
      }
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Mark a product as synced with the server
   * @param localId Local product ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated product document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<ProductDocument | null> {
    const product = await this.findById(localId);
    if (!product) {
      return null;
    }
    
    const updates: Partial<ProductDocType> = {
      isLocalOnly: false,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (amplifyId) {
      updates.amplifyId = amplifyId;
    }
    
    return this.update(localId, updates) as Promise<ProductDocument | null>;
  }

  /**
   * Get products with discounts
   */
  async findWithDiscounts(categoryId?: string): Promise<ProductDocument[]> {
    const selector: any = {
      $and: [
        { isDeleted: { $ne: true } },
        { discount: { $gt: 0 } }
      ]
    };

    if (categoryId) {
      selector.$and.push({ categoryId });
    }

    const results = await this.collection.find({
      selector,
      sort: [{ discount: 'desc' }]
    }).exec();
    return results as ProductDocument[];
  }

  /**
   * Calculate final price including discount and additional price
   */
  calculateFinalPrice(product: ProductDocument): number {
    let finalPrice = product.price;
    
    // Apply discount
    if (product.discount && product.discount > 0) {
      finalPrice = finalPrice * (1 - product.discount / 100);
    }
    
    // Add additional price
    if (product.additionalPrice && product.additionalPrice > 0) {
      finalPrice += product.additionalPrice;
    }
    
    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Delete all products in a category (for cascade delete)
   */
  async deleteByCategoryId(categoryId: string): Promise<number> {
    const products = await this.findByCategoryId(categoryId);
    let deletedCount = 0;

    for (const product of products) {
      const success = await this.softDelete(product.id);
      if (success) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get all products ordered by displayOrder, then by createdAt
   */
  async findAllOrdered(): Promise<ProductDocument[]> {
    const results = await this.collection.find({
      selector: {
        isDeleted: { $ne: true }
      },
      sort: [{ displayOrder: 'asc' }, { createdAt: 'asc' }]
    }).exec();
    return results as ProductDocument[];
  }
}