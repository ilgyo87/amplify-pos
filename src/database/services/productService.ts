import { RxDatabase } from 'rxdb';
import { ProductDocument, ProductDocType } from '../schemas/product';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { ProductRepository } from '../repositories/ProductRepository';
import { validateProductForm, checkForProductDuplicates, ProductFormData, ProductValidationErrors } from '../../utils/productValidation';

/**
 * Service for handling product-related business logic
 */
export class ProductService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private productRepository: ProductRepository | null = null;

  /**
   * Initialize the service and database connection
   */
  public async initialize(): Promise<void> {
    if (!this.db) {
      try {
        this.db = await getDatabaseInstance();
        this.productRepository = new ProductRepository(this.db.products);
      } catch (error) {
        console.error('Failed to initialize ProductService:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
  }
  
  /**
   * Get the product repository instance
   * @throws {Error} If repository is not initialized
   */
  private getRepository(): ProductRepository {
    if (!this.productRepository) {
      throw new Error('Product repository not initialized');
    }
    return this.productRepository;
  }

  /**
   * Create a new product with validation
   * @param productData Product data
   * @returns Object with product document and validation errors
   */
  async createProduct(
    productData: ProductFormData
  ): Promise<{ product?: ProductDocument; errors?: ProductValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateProductForm(productData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates
    const duplicateCheck = await checkForProductDuplicates(
      productData,
      (name, categoryId, excludeId) => repository.existsByNameInCategory(name, categoryId, excludeId),
      undefined
    );

    if (duplicateCheck.isDuplicate) {
      return { duplicateError: `A product with this name already exists in this category` };
    }

    // Set default values for new products
    const productWithDefaults = {
      ...productData,
      isLocalOnly: (productData as any).isLocalOnly !== undefined ? (productData as any).isLocalOnly : true,
      isDeleted: false
    };
    
    const product = await repository.create(productWithDefaults) as ProductDocument;
    return { product };
  }

  /**
   * Get a product by ID
   * @param id Product ID
   * @returns The product document or null if not found
   */
  async getProductById(id: string): Promise<ProductDocument | null> {
    const repository = this.getRepository();
    return repository.findById(id) as Promise<ProductDocument | null>;
  }

  /**
   * Get all products
   * @returns Array of product documents
   */
  async getAllProducts(): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findAllOrdered() as Promise<ProductDocument[]>;
  }

  /**
   * Update an existing product with validation
   * @param id Product ID
   * @param productData Data to update
   * @returns Object with updated product document and validation errors
   */
  async updateProduct(
    id: string, 
    productData: ProductFormData
  ): Promise<{ product?: ProductDocument; errors?: ProductValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateProductForm(productData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Get the existing product to check for duplicates in the right category context
    const existingProduct = await this.getProductById(id);
    if (!existingProduct) {
      return { errors: { name: 'Product not found' } };
    }

    // Check for duplicates (only if name or category changed)
    if (productData.name !== existingProduct.name || productData.categoryId !== existingProduct.categoryId) {
      const duplicateCheck = await checkForProductDuplicates(
        productData,
        (name, categoryId, excludeId) => repository.existsByNameInCategory(name, categoryId, excludeId),
        id
      );

      if (duplicateCheck.isDuplicate) {
        return { duplicateError: `A product with this name already exists in this category` };
      }
    }

    // Update the product
    const product = await repository.update(id, {
      ...productData,
      updatedAt: new Date().toISOString(),
    }) as ProductDocument | null;

    if (!product) {
      return { errors: { name: 'Failed to update product' } };
    }

    return { product };
  }

  /**
   * Delete a product by ID
   * @param id Product ID
   * @returns True if deleted, false otherwise
   */
  async deleteProduct(id: string): Promise<boolean> {
    const repository = this.getRepository();
    return repository.softDelete(id);
  }

  /**
   * Search for products across multiple fields
   * @param searchTerm Search term to match against name, description
   * @param limit Optional limit for results
   * @returns Array of matching product documents
   */
  async searchProducts(searchTerm: string, limit?: number): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.search(searchTerm, undefined, limit);
  }

  /**
   * Search for products by name only
   * @param searchTerm Search term to match against name
   * @returns Array of matching product documents
   */
  async searchProductsByName(searchTerm: string): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.searchByName(searchTerm);
  }

  /**
   * Get local only products
   * @returns Array of local only product documents
   */
  async getLocalOnlyProducts(): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced products
   * @returns Array of synced product documents
   */
  async getSyncedProducts(): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Find products by category ID
   * @param categoryId Category ID to filter by
   * @returns Array of matching product documents
   */
  async findByCategoryId(categoryId: string): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findByCategoryId(categoryId);
  }

  /**
   * Get all products that haven't been synced with the server
   * @param forceRefresh Whether to force a refresh of cached data
   * @returns Array of unsynced product documents
   */
  async getUnsyncedProducts(forceRefresh = false): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments(forceRefresh) as Promise<ProductDocument[]>;
  }

  /**
   * Mark a product as synced with the server
   * @deprecated Use markAsSynced instead
   * @param id Product ID
   */
  async markProductAsSynced(id: string): Promise<void> {
    await this.markAsSynced(id, '');
  }

  /**
   * Mark a product as synced with the server
   * @param localId Local product ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated product document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<ProductDocument | null> {
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId) as Promise<ProductDocument | null>;
  }

  /**
   * Get the total count of products
   * @returns Number of products
   */
  async getProductsCount(): Promise<number> {
    const repository = this.getRepository();
    return repository.count();
  }

  /**
   * Subscribe to changes in the products collection
   * @param callback Function to call when changes occur
   * @returns Unsubscribe function
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    if (!this.productRepository) {
      console.error('Product repository not initialized');
      return () => {};
    }
    return this.productRepository.subscribeToChanges(callback);
  }

  /**
   * Bulk upsert multiple products
   * @param products Array of product data to upsert
   */
  async bulkUpsert(products: Array<Partial<ProductDocType> & { id: string }>): Promise<void> {
    if (!products.length) return;
    
    const repository = this.getRepository();
    
    // Process in chunks to avoid overloading the database
    const CHUNK_SIZE = 50;
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      await repository.bulkUpsert(chunk);
    }
  }

  /**
   * Find products by business ID
   * @param businessId Business ID to filter by
   * @returns Array of product documents for the business
   */
  async findByBusinessId(businessId: string): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findByBusinessId(businessId);
  }

  /**
   * Get all products sorted by name
   * @returns Array of product documents sorted by name
   */
  async getAllProductsSorted(): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findAll().then(products => 
      [...products].sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  /**
   * Get products by price range
   * @param minPrice Minimum price (inclusive)
   * @param maxPrice Maximum price (inclusive)
   * @returns Array of product documents within the price range
   */
  async getProductsByPriceRange(minPrice: number, maxPrice: number): Promise<ProductDocument[]> {
    const repository = this.getRepository();
    return repository.findByPriceRange(minPrice, maxPrice);
  }
}

export const productService = new ProductService();
