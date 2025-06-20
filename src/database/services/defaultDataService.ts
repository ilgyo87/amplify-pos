import { categoryService } from './categoryService';
import { productService } from './productService';
import { CategoryFormData } from '../../utils/categoryValidation';
import { ProductFormData } from '../../utils/productValidation';

export interface DefaultCategory {
  name: string;
  description: string;
  color: string;
  displayOrder: number;
}

export interface DefaultProduct {
  name: string;
  description: string;
  price: number;
  categoryName: string;
  imageName?: string;
  discount?: number;
  additionalPrice?: number;
  notes?: string;
}


// Default categories for dry cleaning business
const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Dry Cleaning',
    description: 'Professional dry cleaning services',
    color: '#007AFF',
    displayOrder: 1
  },
  {
    name: 'Laundry',
    description: 'Wash and fold laundry services',
    color: '#34C759',
    displayOrder: 2
  },
  {
    name: 'Alterations',
    description: 'Clothing alterations and repairs',
    color: '#FF9500',
    displayOrder: 3
  },
  {
    name: 'Special Services',
    description: 'Specialty cleaning and treatments',
    color: '#AF52DE',
    displayOrder: 4
  },
  {
    name: 'Add-ons',
    description: 'Additional services and charges',
    color: '#FF3B30',
    displayOrder: 5
  }
];

// Default products mapped to garment images for dry cleaning services
const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // Dry Cleaning Products
  {
    name: 'Pants',
    description: 'Dry cleaning for dress pants and trousers',
    price: 4.00,
    categoryName: 'Dry Cleaning',
    imageName: 'pants'
  },
  {
    name: 'Blazer',
    description: 'Dry cleaning for blazers and jackets',
    price: 6.00,
    categoryName: 'Dry Cleaning',
    imageName: 'blazer'
  },
  {
    name: 'Suit',
    description: 'Dry cleaning for suits',
    price: 12.00,
    categoryName: 'Dry Cleaning',
    imageName: 'suit'
  },
  {
    name: 'Polo Shirt',
    description: 'Dry cleaning for polo shirts',
    price: 4.00,
    categoryName: 'Dry Cleaning',
    imageName: 'polo'
  },
  {
    name: 'Shirt',
    description: 'Dry cleaning for shirts',
    price: 4.00,
    categoryName: 'Dry Cleaning',
    imageName: 't-shirt'
  },
  {
    name: 'Skirt',
    description: 'Dry cleaning for skirts',
    price: 4.00,
    categoryName: 'Dry Cleaning',
    imageName: 'skirt'
  },
  {
    name: 'Dress',
    description: 'Dry cleaning for dresses',
    price: 8.00,
    categoryName: 'Dry Cleaning',
    imageName: 'dress'
  },
  {
    name: 'Jersey',
    description: 'Dry cleaning for jerseys',
    price: 6.00,
    categoryName: 'Dry Cleaning',
    imageName: 'jersey'
  },
  {
    name: 'Jacket',
    description: 'Dry cleaning for jackets',
    price: 8.00,
    categoryName: 'Dry Cleaning',
    imageName: 'jacket'
  },
  {
    name: 'Winter Coat',
    description: 'Dry cleaning for winter coats and heavy jackets',
    price: 10.00,
    categoryName: 'Dry Cleaning',
    imageName: 'winter-coat'
  },

  // Laundry Products  
  {
    name: 'Dress-Shirt',
    description: 'Wash and fold service for dress shirts',
    price: 2.50,
    categoryName: 'Laundry',
    imageName: 'dress-shirt'
  },
  {
    name: 'Jeans',
    description: 'Wash and fold service for jeans',
    price: 4.00,
    categoryName: 'Laundry',
    imageName: 'jeans'
  },
  {
    name: 'T-Shirt',
    description: 'Wash and fold for t-shirts',
    price: 3.00,
    categoryName: 'Laundry',
    imageName: 't-shirt'
  },
  {
    name: 'Kids Clothes',
    description: 'Wash and fold for children\'s clothing',
    price: 2.00,
    categoryName: 'Laundry',
    imageName: 'kids-clothes'
  },

  // Alterations Products
  {
    name: 'Hem Pants',
    description: 'Hemming service for pants and trousers',
    price: 12.00,
    categoryName: 'Alterations',
    imageName: 'pants',
    notes: 'Basic hem, no rush service'
  },
  {
    name: 'Jacket Alterations',
    description: 'Tailoring services for jackets',
    price: 25.00,
    categoryName: 'Alterations',
    imageName: 'jacket',
    notes: 'Includes sleeve shortening and body adjustments'
  },
  {
    name: 'Dress Alterations',
    description: 'Professional dress alterations',
    price: 20.00,
    categoryName: 'Alterations',
    imageName: 'dress',
    notes: 'Taking in, letting out, and length adjustments'
  },
  {
    name: 'Button Replacement',
    description: 'Replace missing or damaged buttons',
    price: 3.00,
    categoryName: 'Alterations',
    imageName: 'buttons',
    notes: 'Price per button, matching buttons when possible'
  },
  {
    name: 'Zipper Repair',
    description: 'Fix or replace broken zippers',
    price: 15.00,
    categoryName: 'Alterations',
    imageName: 'jacket',
    notes: 'Includes zipper replacement if needed'
  },

  // Special Services Products
  {
    name: 'Wedding Dress',
    description: 'Specialized cleaning for wedding dresses',
    price: 150.00,
    categoryName: 'Special Services',
    imageName: 'dress',
    notes: 'Includes preservation boxing'
  },
  {
    name: 'Leather Jacket',
    description: 'Specialized leather cleaning',
    price: 35.00,
    categoryName: 'Special Services',
    imageName: 'jacket',
    notes: 'Professional leather treatment'
  },
  {
    name: 'Formal Suit',
    description: 'Premium cleaning for formal wear',
    price: 25.00,
    categoryName: 'Special Services',
    imageName: 'suit',
    notes: 'White glove service with hand pressing'
  },
  {
    name: 'Curtains',
    description: 'Cleaning service for curtains and drapes',
    price: 20.00,
    categoryName: 'Special Services',
    imageName: 'curtain',
    notes: 'Price per panel, pickup and delivery available'
  },
  {
    name: 'Comforter/Blanket',
    description: 'Cleaning for bedding and comforters',
    price: 25.00,
    categoryName: 'Special Services',
    imageName: 'blankets',
    notes: 'Large item cleaning with special care'
  },
  {
    name: 'Shoe Cleaning',
    description: 'Professional shoe cleaning and polishing',
    price: 15.00,
    categoryName: 'Special Services',
    imageName: 'shoes',
    notes: 'Includes conditioning and waterproofing'
  },

  // Add-on Services
  {
    name: 'Extra Button',
    description: 'Additional button replacement',
    price: 1.00,
    categoryName: 'Add-ons',
    imageName: 'buttons'
  },
  {
    name: 'Patch',
    description: 'Fabric patch repair',
    price: 2.00,
    categoryName: 'Add-ons',
    imageName: 'patch'
  },
  {
    name: 'Starch',
    description: 'Heavy starch treatment',
    price: 1.50,
    categoryName: 'Add-ons',
    imageName: 'spray'
  },
  {
    name: 'Rush Service',
    description: 'Same day or next day service',
    price: 5.00,
    categoryName: 'Add-ons',
    imageName: 'clock'
  },
  {
    name: 'Mothproofing',
    description: 'Moth protection treatment',
    price: 3.00,
    categoryName: 'Add-ons',
    imageName: 'shield'
  },
  {
    name: 'Deodorizing',
    description: 'Odor removal treatment',
    price: 2.50,
    categoryName: 'Add-ons',
    imageName: 'spray'
  },
  {
    name: 'Water Repellent',
    description: 'Water resistance treatment',
    price: 4.00,
    categoryName: 'Add-ons',
    imageName: 'umbrella'
  },
  {
    name: 'Fabric Softener',
    description: 'Extra fabric softening',
    price: 1.00,
    categoryName: 'Add-ons',
    imageName: 'spray'
  }
];


/**
 * Service for setting up default data in the database
 */
export class DefaultDataService {
  
  /**
   * Initialize default categories and products in the database
   * Only creates data if the database is empty
   * @returns Promise<boolean> - true if data was created, false if data already exists
   */
  async initializeDefaultData(): Promise<boolean> {
    try {
      // Initialize services
      await categoryService.initialize();
      await productService.initialize();

      console.log('Setting up default categories and products...');

      // Create default categories
      const createdCategories: { [name: string]: string } = {};
      
      for (const categoryData of DEFAULT_CATEGORIES) {
        try {
          console.log(`[DEFAULT DATA] Creating category: ${categoryData.name}`);
          const categoryFormData: CategoryFormData = {
            name: categoryData.name,
            description: categoryData.description,
            color: categoryData.color,
            displayOrder: categoryData.displayOrder,
            isActive: true
          };
          
          console.log(`[DEFAULT DATA] Category form data:`, categoryFormData);
          const result = await categoryService.createCategory(categoryFormData);
          console.log(`[DEFAULT DATA] Category creation result:`, result);
          
          if (result.category) {
            createdCategories[categoryData.name] = result.category.id;
            console.log(`[DEFAULT DATA] ✓ Created category: ${categoryData.name} (ID: ${result.category.id})`);
          } else {
            console.error(`[DEFAULT DATA] ✗ Failed to create category ${categoryData.name}:`, result.errors || result.duplicateError);
            // If it's a duplicate, try to find the existing category
            if (result.duplicateError) {
              const existingCategories = await categoryService.getAllCategories();
              const existing = existingCategories.find(c => c.name === categoryData.name);
              if (existing) {
                createdCategories[categoryData.name] = existing.id;
                console.log(`[DEFAULT DATA] ✓ Using existing category: ${categoryData.name} (ID: ${existing.id})`);
              }
            }
          }
        } catch (error) {
          console.error(`[DEFAULT DATA] Error creating category ${categoryData.name}:`, error);
        }
      }

      // Create default products
      let productsCreated = 0;
      
      for (const productData of DEFAULT_PRODUCTS) {
        try {
          const categoryId = createdCategories[productData.categoryName];
          if (!categoryId) {
            console.error(`Category not found for product: ${productData.name}`);
            continue;
          }

          const productFormData: ProductFormData = {
            name: productData.name,
            description: productData.description,
            price: productData.price,
            categoryId: categoryId,
            imageName: productData.imageName || '',
            discount: productData.discount || 0,
            additionalPrice: productData.additionalPrice || 0,
            notes: productData.notes || ''
          };

          const result = await productService.createProduct(productFormData);
          if (result.product) {
            productsCreated++;
            console.log(`Created product: ${productData.name}`);
          } else {
            console.error(`Failed to create product ${productData.name}:`, result.errors || result.duplicateError);
          }
        } catch (error) {
          console.error(`Error creating product ${productData.name}:`, error);
        }
      }

      console.log(`Default data setup complete. Created ${Object.keys(createdCategories).length} categories and ${productsCreated} products.`);
      return true;

    } catch (error) {
      console.error('Error setting up default data:', error);
      return false;
    }
  }

  /**
   * Force reset the database with default data
   * WARNING: This will delete all existing categories and products
   * @returns Promise<boolean> - true if reset was successful
   */
  async resetToDefaultData(): Promise<boolean> {
    try {
      console.log('WARNING: Resetting to default data will delete all existing data');
      
      // Initialize services
      await categoryService.initialize();
      await productService.initialize();

      // Delete all existing products first (to avoid foreign key constraints)
      const existingProducts = await productService.getAllProducts();
      for (const product of existingProducts) {
        await productService.deleteProduct(product.id);
      }

      // Delete all existing categories
      const existingCategories = await categoryService.getAllCategories();
      for (const category of existingCategories) {
        await categoryService.deleteCategory(category.id);
      }

      console.log('Existing data cleared. Setting up default data...');

      // Now create default data
      return await this.initializeDefaultData();

    } catch (error) {
      console.error('Error resetting to default data:', error);
      return false;
    }
  }

  /**
   * Get statistics about the current data in the database
   * @returns Promise<object> - Statistics about categories and products
   */
  async getDataStatistics(): Promise<{
    categoriesCount: number;
    productsCount: number;
    categoriesWithProducts: number;
    emptyCategories: number;
  }> {
    try {
      await categoryService.initialize();
      await productService.initialize();

      const categories = await categoryService.getAllCategories();
      const products = await productService.getAllProducts();

      const categoriesWithProducts = new Set(products.map(p => p.categoryId)).size;
      const emptyCategories = categories.length - categoriesWithProducts;

      return {
        categoriesCount: categories.length,
        productsCount: products.length,
        categoriesWithProducts,
        emptyCategories
      };

    } catch (error) {
      console.error('Error getting data statistics:', error);
      return {
        categoriesCount: 0,
        productsCount: 0,
        categoriesWithProducts: 0,
        emptyCategories: 0
      };
    }
  }

  /**
   * Check if the database has any data
   * @returns Promise<boolean> - true if database has categories or products
   */
  async hasData(): Promise<boolean> {
    try {
      const stats = await this.getDataStatistics();
      return stats.categoriesCount > 0 || stats.productsCount > 0;
    } catch (error) {
      console.error('Error checking if database has data:', error);
      return false;
    }
  }
}

export const defaultDataService = new DefaultDataService();