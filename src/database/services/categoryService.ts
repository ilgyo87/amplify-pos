import { RxDatabase } from 'rxdb';
import { CategoryDocument, CategoryDocType } from '../schemas/category';
import { getDatabaseInstance, DatabaseCollections } from '../config';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { validateCategoryForm, checkForCategoryDuplicates, CategoryFormData, CategoryValidationErrors } from '../../utils/categoryValidation';
import { productService } from './productService';

/**
 * Service for handling category-related business logic
 */
export class CategoryService {
  private db: RxDatabase<DatabaseCollections> | null = null;
  private categoryRepository: CategoryRepository | null = null;

  /**
   * Initialize the service and database connection
   */
  public async initialize(): Promise<void> {
    if (!this.db) {
      try {
        this.db = await getDatabaseInstance();
        this.categoryRepository = new CategoryRepository(this.db.categories);
      } catch (error) {
        console.error('Failed to initialize CategoryService:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
  }
  
  /**
   * Get the category repository instance
   * @throws {Error} If repository is not initialized
   */
  private getRepository(): CategoryRepository {
    if (!this.categoryRepository) {
      throw new Error('Category repository not initialized');
    }
    return this.categoryRepository;
  }

  /**
   * Create a new category with validation
   * @param categoryData Category data
   * @returns Object with category document and validation errors
   */
  async createCategory(
    categoryData: CategoryFormData
  ): Promise<{ category?: CategoryDocument; errors?: CategoryValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateCategoryForm(categoryData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates
    const duplicateCheck = await checkForCategoryDuplicates(
      categoryData,
      (name, excludeId) => repository.existsByName(name, excludeId),
      undefined
    );

    if (duplicateCheck.isDuplicate) {
      return { duplicateError: `A category with this name already exists` };
    }

    // Set default values for new categories
    const categoryWithDefaults = {
      ...categoryData,
      isLocalOnly: (categoryData as any).isLocalOnly !== undefined ? (categoryData as any).isLocalOnly : true,
      isDeleted: false
    };
    
    const category = await repository.create(categoryWithDefaults) as CategoryDocument;
    return { category };
  }

  /**
   * Get a category by ID
   * @param id Category ID
   * @returns The category document or null if not found
   */
  async getCategoryById(id: string): Promise<CategoryDocument | null> {
    const repository = this.getRepository();
    return repository.findById(id) as Promise<CategoryDocument | null>;
  }

  /**
   * Get all categories
   * @returns Array of category documents
   */
  async getAllCategories(): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.findAllOrdered() as Promise<CategoryDocument[]>;
  }

  /**
   * Update an existing category with validation
   * @param id Category ID
   * @param categoryData Data to update
   * @returns Object with updated category document and validation errors
   */
  async updateCategory(
    id: string, 
    categoryData: CategoryFormData
  ): Promise<{ category?: CategoryDocument | null; errors?: CategoryValidationErrors; duplicateError?: string }> {
    const repository = this.getRepository();
    
    // Validate form data
    const validationErrors = validateCategoryForm(categoryData);
    if (Object.keys(validationErrors).length > 0) {
      return { errors: validationErrors };
    }

    // Check for duplicates (excluding current category)
    const duplicateCheck = await checkForCategoryDuplicates(
      categoryData,
      (name, excludeId) => repository.existsByName(name, excludeId),
      id
    );

    if (duplicateCheck.isDuplicate) {
      return { duplicateError: `A category with this name already exists` };
    }

    const category = await repository.update(id, categoryData) as CategoryDocument | null;
    return { category };
  }

  /**
   * Delete a category by ID and all its associated products
   * @param id Category ID
   * @returns True if deleted, false otherwise
   */
  async deleteCategory(id: string): Promise<boolean> {
    try {
      // First, delete all products in this category
      await productService.initialize();
      const productsInCategory = await productService.findByCategoryId(id);
      
      // Delete each product in the category
      for (const product of productsInCategory) {
        await productService.deleteProduct(product.id);
      }
      
      // Then delete the category itself
      const repository = this.getRepository();
      return repository.softDelete(id);
    } catch (error) {
      console.error('Error deleting category and its products:', error);
      throw error;
    }
  }

  /**
   * Search for categories across multiple fields
   * @param searchTerm Search term to match against name, description
   * @param limit Optional limit for results
   * @returns Array of matching category documents
   */
  async searchCategories(searchTerm: string, limit?: number): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.search(searchTerm, limit);
  }

  /**
   * Search for categories by name only
   * @param searchTerm Search term to match against name
   * @returns Array of matching category documents
   */
  async searchCategoriesByName(searchTerm: string): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.searchByName(searchTerm);
  }

  /**
   * Get local only categories
   * @returns Array of local only category documents
   */
  async getLocalOnlyCategories(): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.getLocalOnly();
  }

  /**
   * Get synced categories
   * @returns Array of synced category documents
   */
  async getSyncedCategories(): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.getSynced();
  }

  /**
   * Find a category by name
   * @param name Category name to search for
   * @returns The category document or null if not found
   */
  async findByName(name: string): Promise<CategoryDocument | null> {
    const repository = this.getRepository();
    return repository.findByName(name);
  }

  /**
   * Get all categories that haven't been synced with the server
   * @param forceRefresh Whether to force a refresh of cached data
   * @returns Array of unsynced category documents
   */
  async getUnsyncedCategories(forceRefresh = false): Promise<CategoryDocument[]> {
    const repository = this.getRepository();
    return repository.findUnsyncedDocuments(forceRefresh) as Promise<CategoryDocument[]>;
  }

  /**
   * Mark a category as synced with the server
   * @param localId Local category ID
   * @param amplifyId Amplify ID from the server
   * @returns The updated category document or null if not found
   */
  async markAsSynced(localId: string, amplifyId: string): Promise<CategoryDocument | null> {
    const repository = this.getRepository();
    return repository.markAsSynced(localId, amplifyId) as Promise<CategoryDocument | null>;
  }

  /**
   * Get the total count of categories
   * @returns Number of categories
   */
  async getCategoriesCount(): Promise<number> {
    const repository = this.getRepository();
    return repository.count();
  }

  /**
   * Subscribe to changes in the categories collection
   * @param callback Function to call when changes occur
   * @returns Unsubscribe function
   */
  subscribeToChanges(callback: (change: any) => void): () => void {
    if (!this.categoryRepository) {
      console.error('Category repository not initialized');
      return () => {};
    }
    return this.categoryRepository.subscribeToChanges(callback);
  }

  /**
   * Bulk upsert multiple categories
   * @param categories Array of category data to upsert
   */
  async bulkUpsert(categories: Array<Partial<CategoryDocType> & { id: string }>): Promise<void> {
    if (!categories.length) return;
    
    const repository = this.getRepository();
    
    const CHUNK_SIZE = 50;
    for (let i = 0; i < categories.length; i += CHUNK_SIZE) {
      const chunk = categories.slice(i, i + CHUNK_SIZE);
      await repository.bulkUpsert(chunk);
    }
  }
}

export const categoryService = new CategoryService();