import { categoryService } from './categoryService';
import { productService } from './productService';
import { employeeService } from './employeeService';
import { CategoryFormData } from '../../utils/categoryValidation';
import { ProductFormData } from '../../utils/productValidation';
import { EmployeeFormData } from '../../utils/employeeValidation';

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

export interface DefaultEmployee {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  role: string;
  phone?: string;
  isActive: boolean;
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
  }
];

// Default products mapped to garment images for dry cleaning services
const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // Dry Cleaning Products
  {
    name: 'Dress Shirt',
    description: 'Professional dry cleaning for dress shirts',
    price: 3.50,
    categoryName: 'Dry Cleaning',
    imageName: 'shirt-cut'
  },
  {
    name: 'Suit Jacket',
    description: 'Dry cleaning for suit jackets and blazers',
    price: 8.00,
    categoryName: 'Dry Cleaning',
    imageName: 'suit'
  },
  {
    name: 'Dress',
    description: 'Dry cleaning for dresses',
    price: 12.00,
    categoryName: 'Dry Cleaning',
    imageName: 'dress'
  },
  {
    name: 'Pants/Trousers',
    description: 'Dry cleaning for dress pants and trousers',
    price: 6.00,
    categoryName: 'Dry Cleaning',
    imageName: 'pants'
  },
  {
    name: 'Winter Coat',
    description: 'Dry cleaning for winter coats and heavy jackets',
    price: 15.00,
    categoryName: 'Dry Cleaning',
    imageName: 'winter-coat'
  },
  {
    name: 'Polo Shirt',
    description: 'Dry cleaning for polo shirts',
    price: 4.00,
    categoryName: 'Dry Cleaning',
    imageName: 'polo'
  },

  // Laundry Products  
  {
    name: 'T-Shirt',
    description: 'Wash and fold service for t-shirts',
    price: 2.50,
    categoryName: 'Laundry',
    imageName: 't-shirt'
  },
  {
    name: 'Jeans',
    description: 'Wash and fold service for jeans',
    price: 4.00,
    categoryName: 'Laundry',
    imageName: 'jeans'
  },
  {
    name: 'Casual Shirt',
    description: 'Wash and fold for casual shirts',
    price: 3.00,
    categoryName: 'Laundry',
    imageName: 'clothes-cut'
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
  }
];

// Default employees for testing and initial setup
const DEFAULT_EMPLOYEES: DefaultEmployee[] = [
  {
    firstName: 'Manager',
    lastName: 'Demo',
    email: 'manager@drycleaner.com',
    pin: '1234',
    role: 'Manager',
    phone: '(555) 123-4567',
    isActive: true
  },
  {
    firstName: 'Employee',
    lastName: 'Demo',
    email: 'employee@drycleaner.com',
    pin: '5678',
    role: 'Cashier',
    phone: '(555) 234-5678',
    isActive: true
  },
  {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@drycleaner.com',
    pin: '0000',
    role: 'Staff',
    isActive: true
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
      await employeeService.initialize();

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
          const categoryFormData: CategoryFormData = {
            name: categoryData.name,
            description: categoryData.description,
            color: categoryData.color,
            displayOrder: categoryData.displayOrder,
            isActive: true
          };
          const result = await categoryService.createCategory(categoryFormData);
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

      // Create default employees
      let employeesCreated = 0;
      
      for (const employeeData of DEFAULT_EMPLOYEES) {
        try {
          const employeeFormData: EmployeeFormData = {
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            email: employeeData.email,
            pin: employeeData.pin,
            role: employeeData.role,
            phone: employeeData.phone,
            isActive: employeeData.isActive,
            hireDate: new Date().toISOString().split('T')[0]
          };

          const result = await employeeService.createEmployee(employeeFormData);
          if (result.employee) {
            employeesCreated++;
            console.log(`Created employee: ${employeeData.firstName} ${employeeData.lastName} (PIN: ${employeeData.pin})`);
          } else {
            console.error(`Failed to create employee ${employeeData.firstName} ${employeeData.lastName}:`, result.errors || result.duplicateError);
          }
        } catch (error) {
          console.error(`Error creating employee ${employeeData.firstName} ${employeeData.lastName}:`, error);
        }
      }

      console.log(`Default data setup complete. Created ${Object.keys(createdCategories).length} categories, ${productsCreated} products, and ${employeesCreated} employees.`);
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
      await employeeService.initialize();

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

      // Delete all existing employees
      const existingEmployees = await employeeService.getAllEmployees();
      for (const employee of existingEmployees) {
        await employeeService.deleteEmployee(employee.id);
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
    employeesCount: number;
    categoriesWithProducts: number;
    emptyCategories: number;
  }> {
    try {
      await categoryService.initialize();
      await productService.initialize();
      await employeeService.initialize();

      const categories = await categoryService.getAllCategories();
      const products = await productService.getAllProducts();
      const employees = await employeeService.getAllEmployees();

      const categoriesWithProducts = new Set(products.map(p => p.categoryId)).size;
      const emptyCategories = categories.length - categoriesWithProducts;

      return {
        categoriesCount: categories.length,
        productsCount: products.length,
        employeesCount: employees.length,
        categoriesWithProducts,
        emptyCategories
      };

    } catch (error) {
      console.error('Error getting data statistics:', error);
      return {
        categoriesCount: 0,
        productsCount: 0,
        employeesCount: 0,
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