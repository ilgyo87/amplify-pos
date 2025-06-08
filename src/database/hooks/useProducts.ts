import { useState, useEffect, useRef, useCallback } from 'react';
import { productService } from '../services/productService';
import { ProductDocument } from '../schemas/product';
import { getDatabaseInstance } from '../index';

export const useProducts = (categoryId?: string) => {
  const [allProducts, setAllProducts] = useState<ProductDocument[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchQuery = useRef<string>('');
  const currentCategoryId = useRef<string | undefined>(categoryId);

  // Manual refresh function for pull-to-refresh
  const refreshProducts = useCallback(async () => {
    if (!isInitialized) {
      console.log('Product service not initialized yet, skipping refresh');
      return;
    }
    
    try {
      // Clear any errors
      setError(null);
      
      // The reactive query will automatically update the products
      // This function is mainly for triggering a manual refresh indicator
      console.log('Manual refresh triggered - reactive query will handle data updates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh products');
      console.error('Error refreshing products:', err);
    }
  }, [isInitialized]);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    currentSearchQuery.current = query;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setFilteredProducts(allProducts);
      setSearchLoading(false);
      return;
    }
    
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results: ProductDocument[];
        
        if (currentCategoryId.current) {
          // Search within category
          results = await productService.searchProducts(query);  // category filtering will be done client-side
        } else {
          // Global search
          results = await productService.searchProducts(query);
        }
        
        setFilteredProducts(results);
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Initialize and set up reactive subscription
  useEffect(() => {
    let subscription: any = null;
    
    const setupReactiveQuery = async () => {
      try {
        setLoading(true);
        await productService.initialize();
        const db = await getDatabaseInstance();
        setIsInitialized(true);
        
        // Update current category ref
        currentCategoryId.current = categoryId;
        
        // Create reactive query based on current category
        const query = categoryId 
          ? db.products.find({
              selector: {
                isDeleted: { $ne: true },
                categoryId: categoryId
              },
              sort: [{ name: 'asc' }]
            })
          : db.products.find({
              selector: {
                isDeleted: { $ne: true }
              },
              sort: [{ name: 'asc' }]
            });
        
        // Subscribe to reactive query
        subscription = query.$.subscribe({
          next: (products: ProductDocument[]) => {
            console.log('RxDB reactive query updated, products:', products.length, 'categoryId:', categoryId);
            setAllProducts(products);
            
            // Apply existing search if any
            if (currentSearchQuery.current) {
              // Filter locally for search
              const searchTerm = currentSearchQuery.current.toLowerCase();
              const filtered = products.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description && product.description.toLowerCase().includes(searchTerm))
              );
              setFilteredProducts(filtered);
            } else {
              setFilteredProducts(products);
            }
            setLoading(false);
          },
          error: (err: any) => {
            console.error('RxDB reactive query error:', err);
            setError(err.message || 'Failed to load products');
            setLoading(false);
          }
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize products');
        console.error('Error setting up reactive products:', err);
        setLoading(false);
      }
    };

    setupReactiveQuery();

    // Cleanup subscription on unmount or category change
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [categoryId]); // React to categoryId changes

  // No longer needed - reactive query handles category changes automatically

  // Create a new product
  const createProduct = async (productData: any) => {
    setOperationLoading(true);
    try {
      const result = await productService.createProduct(productData);
      if (result.errors || result.duplicateError) {
        return result;
      }
      return { success: true, product: result.product };
    } catch (err) {
      console.error('Error creating product:', err);
      return { 
        success: false, 
        errors: { name: err instanceof Error ? err.message : 'Failed to create product' } 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Update an existing product
  const updateProduct = async (id: string, productData: any) => {
    setOperationLoading(true);
    try {
      const result = await productService.updateProduct(id, productData);
      if (result.errors || result.duplicateError) {
        return result;
      }
      return { success: true, product: result.product };
    } catch (err) {
      console.error('Error updating product:', err);
      return { 
        success: false, 
        errors: { name: err instanceof Error ? err.message : 'Failed to update product' } 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Delete a product
  const deleteProduct = async (id: string) => {
    setOperationLoading(true);
    try {
      const success = await productService.deleteProduct(id);
      return { success };
    } catch (err) {
      console.error('Error deleting product:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete product' 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Get a product by id
  const getProductById = async (id: string) => {
    try {
      return await productService.getProductById(id);
    } catch (err) {
      console.error('Error getting product:', err);
      return null;
    }
  };

  // Get products with discounts
  const getProductsWithDiscounts = async (categoryId?: string) => {
    try {
      // Filter products with discounts client-side
      const products = categoryId 
        ? await productService.findByCategoryId(categoryId)
        : await productService.getAllProductsSorted();
      return products.filter(product => product.discount && product.discount > 0);
    } catch (err) {
      console.error('Error getting discounted products:', err);
      return [];
    }
  };

  // Get products by price range
  const getProductsByPriceRange = async (minPrice: number, maxPrice: number, categoryId?: string) => {
    try {
      // Filter by price range client-side
      const products = categoryId
        ? await productService.findByCategoryId(categoryId)
        : await productService.getAllProductsSorted();
      return products.filter(product => 
        product.price >= minPrice && product.price <= maxPrice
      );
    } catch (err) {
      console.error('Error getting products by price range:', err);
      return [];
    }
  };

  // Calculate final price
  const calculateFinalPrice = (product: ProductDocument) => {
    // Calculate final price with discount and additional price
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
  };

  return {
    products: filteredProducts,
    allProducts,
    loading,
    searchLoading,
    operationLoading,
    error,
    searchQuery,
    handleSearch,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductsWithDiscounts,
    getProductsByPriceRange,
    calculateFinalPrice,
    refreshProducts
  };
};
