import { useState, useEffect, useRef } from 'react';
import { categoryService } from '../services/categoryService';
import { CategoryDocument } from '../schemas/category';

export const useCategories = () => {
  const [allCategories, setAllCategories] = useState<CategoryDocument[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchQuery = useRef<string>('');

  // Initialize and load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        await categoryService.initialize();
        const categories = await categoryService.getAllCategories();
        setAllCategories(categories);
        setFilteredCategories(categories);
        
        // Subscribe to changes
        const unsubscribe = categoryService.subscribeToChanges(async () => {
          const refreshedCategories = await categoryService.getAllCategories();
          setAllCategories(refreshedCategories);
          
          // Maintain search filter if active
          if (currentSearchQuery.current) {
            handleSearch(currentSearchQuery.current);
          } else {
            setFilteredCategories(refreshedCategories);
          }
        });
        
        return unsubscribe;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    currentSearchQuery.current = query;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setFilteredCategories(allCategories);
      setSearchLoading(false);
      return;
    }
    
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await categoryService.searchCategoriesByName(query);
        setFilteredCategories(results);
      } catch (err) {
        console.error('Error searching categories:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Create a new category
  const createCategory = async (categoryData: any) => {
    setOperationLoading(true);
    try {
      const result = await categoryService.createCategory(categoryData);
      if (result.errors || result.duplicateError) {
        return result;
      }
      return { success: true, category: result.category };
    } catch (err) {
      console.error('Error creating category:', err);
      return { 
        success: false, 
        errors: { name: err instanceof Error ? err.message : 'Failed to create category' } 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Update an existing category
  const updateCategory = async (id: string, categoryData: any) => {
    setOperationLoading(true);
    try {
      const result = await categoryService.updateCategory(id, categoryData);
      if (result.errors || result.duplicateError) {
        return result;
      }
      return { success: true, category: result.category };
    } catch (err) {
      console.error('Error updating category:', err);
      return { 
        success: false, 
        errors: { name: err instanceof Error ? err.message : 'Failed to update category' } 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Delete a category
  const deleteCategory = async (id: string) => {
    setOperationLoading(true);
    try {
      const success = await categoryService.deleteCategory(id);
      return { success };
    } catch (err) {
      console.error('Error deleting category:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete category' 
      };
    } finally {
      setOperationLoading(false);
    }
  };

  // Find a category by id
  const getCategoryById = async (id: string) => {
    try {
      return await categoryService.getCategoryById(id);
    } catch (err) {
      console.error('Error getting category:', err);
      return null;
    }
  };

  return {
    categories: filteredCategories,
    allCategories,
    loading,
    searchLoading,
    operationLoading,
    error,
    searchQuery,
    handleSearch,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById
  };
};
