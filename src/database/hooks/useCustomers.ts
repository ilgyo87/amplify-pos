import { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomerDocument } from '../schemas/customer';
import { customerService } from '../services/customerService';
import { CustomerFormData, ValidationErrors } from '../../utils/customerValidation';

interface CustomerOperationResult {
  success: boolean;
  customer?: CustomerDocument;
  errors?: ValidationErrors;
  duplicateError?: string;
}

export const useCustomers = () => {
  const [allCustomers, setAllCustomers] = useState<CustomerDocument[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Initialize and load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        await customerService.initialize();
        const customers = await customerService.getAllCustomers();
        setAllCustomers(customers);
        setFilteredCustomers(customers);
        
        // Subscribe to changes
        const unsubscribe = customerService.subscribeToChanges(async () => {
          const updatedCustomers = await customerService.getAllCustomers();
          setAllCustomers(updatedCustomers);
          
          // Re-apply search if there's an active search query
          if (searchQuery.trim()) {
            const searchResults = await customerService.searchCustomers(searchQuery);
            setFilteredCustomers(searchResults);
          } else {
            setFilteredCustomers(updatedCustomers);
          }
        });

        return unsubscribe;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = loadCustomers();
    
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub?.());
      }
    };
  }, [searchQuery]);

  // Search functionality with debouncing
  const searchCustomers = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredCustomers(allCustomers);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await customerService.searchCustomers(query);
      setFilteredCustomers(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search customers');
    } finally {
      setSearchLoading(false);
    }
  }, [allCustomers]);

  // Create customer with validation
  const createCustomer = useCallback(async (customerData: CustomerFormData): Promise<CustomerOperationResult> => {
    try {
      setOperationLoading(true);
      const result = await customerService.createCustomer(customerData);
      
      if (result.customer) {
        return { success: true, customer: result.customer };
      } else {
        return { 
          success: false, 
          errors: result.errors,
          duplicateError: result.duplicateError 
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      return { success: false };
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Update customer with validation
  const updateCustomer = useCallback(async (id: string, customerData: CustomerFormData): Promise<CustomerOperationResult> => {
    try {
      setOperationLoading(true);
      const result = await customerService.updateCustomer(id, customerData);
      
      if (result.customer) {
        return { success: true, customer: result.customer };
      } else {
        return { 
          success: false, 
          errors: result.errors,
          duplicateError: result.duplicateError 
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      return { success: false };
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Delete customer
  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      setOperationLoading(true);
      const success = await customerService.deleteCustomer(id);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      return false;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Get customer by ID
  const getCustomerById = useCallback(async (id: string): Promise<CustomerDocument | null> => {
    try {
      return await customerService.getCustomerById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get customer');
      return null;
    }
  }, []);

  // Clear search and show all customers
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredCustomers(allCustomers);
  }, [allCustomers]);

  // Computed values
  const totalCustomers = useMemo(() => allCustomers.length, [allCustomers]);
  const hasSearchResults = useMemo(() => searchQuery.trim() !== '', [searchQuery]);
  const isSearching = useMemo(() => searchLoading, [searchLoading]);

  return {
    // Data
    customers: filteredCustomers,
    allCustomers,
    totalCustomers,
    
    // Search state
    searchQuery,
    hasSearchResults,
    isSearching,
    
    // Loading states
    loading,
    operationLoading,
    
    // Error state
    error,
    
    // Actions
    searchCustomers,
    clearSearch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    clearError: () => setError(null),
    refreshCustomers: async () => {
      const customers = await customerService.getAllCustomers();
      setAllCustomers(customers);
      if (!searchQuery.trim()) {
        setFilteredCustomers(customers);
      }
    }
  };
};