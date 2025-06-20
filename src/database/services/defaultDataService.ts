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
    price: 10.00,
    categoryName: 'Alterations',
    imageName: 'hem',
    notes: 'Basic hem, no rush service'
  },
  {
    name: 'Waist Pants',
    description: 'Waist hemming service for pants and trousers',
    price: 10.00,
    categoryName: 'Alterations',
    imageName: 'waist',
    notes: 'Basic waist hem, no rush service'
  },
  {
    name: 'Zipper Repair',
    description: 'Fix or replace broken zippers',
    price: 10.00,
    categoryName: 'Alterations',
    imageName: 'zipper',
    notes: 'Includes zipper replacement if needed'
  },
  {
    name: 'Taper',
    description: 'Take in service for alterations',
    price: 10.00,
    categoryName: 'Alterations',
    imageName: 'take-in',
    notes: 'Basic take in service, no rush service'
  },
  {
    name: 'Take-In',
    description: 'Take in service for alterations',
    price: 10.00,
    categoryName: 'Alterations',
    imageName: 'shirt-cut',
    notes: 'Basic take in service, no rush service'
  },
  {
    name: 'Patch',
    description: 'Fabric patch repair',
    price: 5.00,
    categoryName: 'Alterations',
    imageName: 'patch',
    notes: 'Price per patch, matching fabric when possible'
  },
  {
    name: 'Button Replacement',
    description: 'Replace missing or damaged buttons',
    price: 1.00,
    categoryName: 'Alterations',
    imageName: 'buttons',
    notes: 'Price per button, matching buttons when possible'
  },

  // Special Services Products
  {
    name: 'Wedding Dress',
    description: 'Specialized cleaning for wedding dresses',
    price: 150.00,
    categoryName: 'Special Services',
    imageName: 'wedding-dress',
    notes: 'Includes preservation boxing'
  },
  {
    name: 'Leather Jacket',
    description: 'Specialized leather cleaning',
    price: 35.00,
    categoryName: 'Special Services',
    imageName: 'leather-jacket',
    notes: 'Professional leather treatment'
  },
  {
    name: 'Tuxedo',
    description: 'Premium cleaning for formal wear',
    price: 25.00,
    categoryName: 'Special Services',
    imageName: 'tuxedo',
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
    name: 'Comforter',
    description: 'Cleaning for bedding and comforters',
    price: 20.00,
    categoryName: 'Special Services',
    imageName: 'comforter',
    notes: 'Large item cleaning with special care'
  },
  {
    name: 'Blanket',
    description: 'Cleaning for blankets and throws',
    price: 15.00,
    categoryName: 'Special Services',
    imageName: 'blankets',
    notes: 'Large item cleaning with special care'
  },
  {
    name: 'Pillow',
    description: 'Cleaning for pillows and cushions',
    price: 10.00,
    categoryName: 'Special Services',
    imageName: 'pillow',
    notes: 'Price per pillow, pickup and delivery available'
  },
  {
    name: 'Rug',
    description: 'Cleaning for rugs and carpets',
    price: 20.00,
    categoryName: 'Special Services',
    imageName: 'rug',
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

      // Get existing categories first to prevent duplicates
      const existingCategories = await categoryService.getAllCategories();
      const existingCategoryMap = new Map(
        existingCategories.map(cat => [cat.name.toLowerCase(), cat])
      );
      
      // Create default categories
      const createdCategories: { [name: string]: string } = {};
      
      for (const categoryData of DEFAULT_CATEGORIES) {
        try {
          // Check if category already exists
          const existingCategory = existingCategoryMap.get(categoryData.name.toLowerCase());
          if (existingCategory) {
            createdCategories[categoryData.name] = existingCategory.id;
            console.log(`[DEFAULT DATA] Category already exists: ${categoryData.name} (ID: ${existingCategory.id})`);
            continue;
          }
          
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
          }
        } catch (error) {
          console.error(`[DEFAULT DATA] Error creating category ${categoryData.name}:`, error);
        }
      }

      // Get existing products to prevent duplicates
      const existingProducts = await productService.getAllProducts();
      const existingProductMap = new Map<string, Set<string>>();
      
      // Build a map of category -> product names for efficient lookup
      for (const product of existingProducts) {
        const productNameLower = product.name.toLowerCase();
        if (!existingProductMap.has(product.categoryId)) {
          existingProductMap.set(product.categoryId, new Set());
        }
        existingProductMap.get(product.categoryId)!.add(productNameLower);
      }
      
      // Create default products
      let productsCreated = 0;
      let productsSkipped = 0;
      
      for (const productData of DEFAULT_PRODUCTS) {
        try {
          const categoryId = createdCategories[productData.categoryName];
          if (!categoryId) {
            console.error(`Category not found for product: ${productData.name}`);
            continue;
          }

          // Check if product already exists in this category
          const categoryProducts = existingProductMap.get(categoryId);
          if (categoryProducts && categoryProducts.has(productData.name.toLowerCase())) {
            console.log(`[DEFAULT DATA] Product already exists: ${productData.name} in category ${productData.categoryName}`);
            productsSkipped++;
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
            console.log(`[DEFAULT DATA] ✓ Created product: ${productData.name}`);
          } else {
            console.error(`[DEFAULT DATA] ✗ Failed to create product ${productData.name}:`, result.errors || result.duplicateError);
          }
        } catch (error) {
          console.error(`[DEFAULT DATA] Error creating product ${productData.name}:`, error);
        }
      }

      const categoriesCreated = Object.keys(createdCategories).length - existingCategories.length;
      console.log(`[DEFAULT DATA] Setup complete:`);
      console.log(`[DEFAULT DATA] - Categories: ${categoriesCreated} created, ${existingCategories.length} already existed`);
      console.log(`[DEFAULT DATA] - Products: ${productsCreated} created, ${productsSkipped} already existed`);
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