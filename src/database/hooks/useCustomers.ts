import { useState, useEffect } from 'react';
import { CustomerDocument } from '../schemas/customer';
import { customerService } from '../services/customerService';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        await customerService.initialize();
        const allCustomers = await customerService.getAllCustomers();
        setCustomers(allCustomers);
        
        // Subscribe to changes
        customerService.subscribeToChanges((updatedCustomers) => {
          setCustomers(updatedCustomers);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const createCustomer = async (customerData: Parameters<typeof customerService.createCustomer>[0]) => {
    try {
      const newCustomer = await customerService.createCustomer(customerData);
      return newCustomer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      throw err;
    }
  };

  const updateCustomer = async (id: string, updateData: Parameters<typeof customerService.updateCustomer>[1]) => {
    try {
      const updatedCustomer = await customerService.updateCustomer(id, updateData);
      return updatedCustomer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const success = await customerService.deleteCustomer(id);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      throw err;
    }
  };

  const searchCustomers = async (searchTerm: string) => {
    try {
      const results = await customerService.searchCustomers(searchTerm);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search customers');
      throw err;
    }
  };

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    clearError: () => setError(null)
  };
};