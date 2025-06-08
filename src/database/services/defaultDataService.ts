import { categoryService } from './categoryService';
import { productService } from './productService';
import { CategoryFormData } from '../../utils/categoryValidation';
import { ProductFormData } from '../../utils/productValidation';

export interface DefaultCategory {
  name: string;
  description: string;
  color: string;
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

// Default categories for a clothing/garment POS system
const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'T-Shirts',
    description: 'Casual t-shirts and tops',
    color: '#FF5733'
  },
  {
    name: 'Shirts',
    description: 'Dress shirts and formal shirts',
    color: '#33FF57'
  },
  {
    name: 'Jackets',
    description: 'Jackets, blazers, and outerwear',
    color: '#3357FF'
  },
  {
    name: 'Dresses',
    description: 'Dresses and gowns',
    color: '#FF33F1'
  },
  {
    name: 'Pants',
    description: 'Trousers and dress pants',
    color: '#F1FF33'
  },
  {
    name: 'Jeans',
    description: 'Denim jeans and casual pants',
    color: '#33FFF1'
  },
  {
    name: 'Shoes',
    description: 'Footwear and accessories',
    color: '#FF8C33'
  },
  {
    name: 'Accessories',
    description: 'Buttons, zippers, and hardware',
    color: '#8C33FF'
  },
  {
    name: 'Kids Clothing',
    description: 'Children and youth clothing',
    color: '#33FF8C'
  },
  {
    name: 'Home & Bedding',
    description: 'Curtains, blankets, and home items',
    color: '#FF3333'
  }
];

// Default products for each category
const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // T-Shirts
  {
    name: 'Basic Cotton T-Shirt',
    description: 'Comfortable cotton t-shirt in various colors',
    price: 19.99,
    categoryName: 'T-Shirts',
    imageName: 't-shirt'
  },
  {
    name: 'Premium Polo Shirt',
    description: 'High-quality polo shirt with collar',
    price: 34.99,
    categoryName: 'T-Shirts',
    imageName: 'polo'
  },
  
  // Shirts
  {
    name: 'Dress Shirt White',
    description: 'Classic white dress shirt for formal occasions',
    price: 49.99,
    categoryName: 'Shirts',
    imageName: 'dress-shirt'
  },
  {
    name: 'Business Casual Shirt',
    description: 'Professional shirt for office wear',
    price: 39.99,
    categoryName: 'Shirts',
    imageName: 'shirt'
  },
  
  // Jackets
  {
    name: 'Leather Jacket',
    description: 'Genuine leather jacket, black',
    price: 199.99,
    categoryName: 'Jackets',
    imageName: 'leather-jacket'
  },
  {
    name: 'Business Blazer',
    description: 'Professional blazer for business wear',
    price: 129.99,
    categoryName: 'Jackets',
    imageName: 'blazer'
  },
  {
    name: 'Winter Coat',
    description: 'Warm winter coat with hood',
    price: 89.99,
    categoryName: 'Jackets',
    imageName: 'winter-coat'
  },
  
  // Dresses
  {
    name: 'Little Black Dress',
    description: 'Classic black dress for any occasion',
    price: 79.99,
    categoryName: 'Dresses',
    imageName: 'dress'
  },
  {
    name: 'Wedding Dress',
    description: 'Elegant white wedding dress',
    price: 499.99,
    categoryName: 'Dresses',
    imageName: 'wedding-dress'
  },
  
  // Pants
  {
    name: 'Dress Pants',
    description: 'Formal dress pants in charcoal',
    price: 59.99,
    categoryName: 'Pants',
    imageName: 'pants'
  },
  {
    name: 'Chino Trousers',
    description: 'Casual chino pants, khaki color',
    price: 44.99,
    categoryName: 'Pants',
    imageName: 'trousers'
  },
  
  // Jeans
  {
    name: 'Classic Blue Jeans',
    description: 'Traditional blue denim jeans',
    price: 69.99,
    categoryName: 'Jeans',
    imageName: 'jeans'
  },
  {
    name: 'Skinny Fit Jeans',
    description: 'Modern skinny fit denim',
    price: 79.99,
    categoryName: 'Jeans',
    imageName: 'denim-jeans'
  },
  
  // Shoes
  {
    name: 'Leather Dress Shoes',
    description: 'Black leather formal shoes',
    price: 119.99,
    categoryName: 'Shoes',
    imageName: 'shoes'
  },
  {
    name: 'Casual Sneakers',
    description: 'Comfortable white sneakers',
    price: 89.99,
    categoryName: 'Shoes',
    imageName: 'sneakers'
  },
  {
    name: 'Winter Boots',
    description: 'Waterproof winter boots',
    price: 149.99,
    categoryName: 'Shoes',
    imageName: 'boots'
  },
  
  // Accessories
  {
    name: 'Premium Buttons Set',
    description: 'High-quality replacement buttons',
    price: 12.99,
    categoryName: 'Accessories',
    imageName: 'buttons'
  },
  {
    name: 'Heavy Duty Zipper',
    description: 'Durable zipper for jackets',
    price: 8.99,
    categoryName: 'Accessories',
    imageName: 'zipper'
  },
  {
    name: 'Fabric Patch Kit',
    description: 'Repair patches for clothing',
    price: 15.99,
    categoryName: 'Accessories',
    imageName: 'patch'
  },
  
  // Kids Clothing
  {
    name: 'Kids T-Shirt Pack',
    description: 'Colorful t-shirts for children',
    price: 29.99,
    categoryName: 'Kids Clothing',
    imageName: 'kids-clothes'
  },
  {
    name: 'Children Winter Wear',
    description: 'Warm clothes for kids',
    price: 49.99,
    categoryName: 'Kids Clothing',
    imageName: 'children-wear'
  },
  
  // Home & Bedding
  {
    name: 'Luxury Blanket',
    description: 'Soft and warm blanket',
    price: 79.99,
    categoryName: 'Home & Bedding',
    imageName: 'blanket'
  },
  {
    name: 'Window Curtains',
    description: 'Elegant curtains for home decor',
    price: 39.99,
    categoryName: 'Home & Bedding',
    imageName: 'curtain'
  },
  {
    name: 'Memory Foam Pillow',
    description: 'Comfortable memory foam pillow',
    price: 29.99,
    categoryName: 'Home & Bedding',
    imageName: 'pillow'
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

      // Check if categories already exist
      const existingCategories = await categoryService.getAllCategories();
      if (existingCategories.length > 0) {
        console.log('Categories already exist, skipping default data creation');
        return false;
      }

      console.log('Setting up default categories and products...');

      // Create default categories
      const createdCategories: { [name: string]: string } = {};
      
      for (const categoryData of DEFAULT_CATEGORIES) {
        try {
          const result = await categoryService.createCategory(categoryData);
          if (result.category) {
            createdCategories[categoryData.name] = result.category.id;
            console.log(`Created category: ${categoryData.name}`);
          } else {
            console.error(`Failed to create category ${categoryData.name}:`, result.errors || result.duplicateError);
          }
        } catch (error) {
          console.error(`Error creating category ${categoryData.name}:`, error);
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
            imageName: productData.imageName,
            discount: productData.discount,
            additionalPrice: productData.additionalPrice,
            notes: productData.notes
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