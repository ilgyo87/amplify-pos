import { useState, useEffect, useCallback } from 'react';
import { businessService, BusinessCreateResult } from '../services/businessService';
import { BusinessDocument } from '../schemas/business';
import { BusinessFormData, BusinessValidationErrors } from '../../utils/businessValidation';

export const useBusiness = () => {
  const [businesses, setBusinesses] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await businessService.initialize();
      const businessList = await businessService.getAllBusinesses();
      setBusinesses(businessList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
      console.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const refreshBusinesses = useCallback(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const createBusiness = useCallback(async (data: BusinessFormData): Promise<{ success: boolean; business?: BusinessDocument; errors?: BusinessValidationErrors; duplicateError?: string }> => {
    try {
      setOperationLoading(true);
      setError(null);
      
      const result = await businessService.createBusiness(data);
      
      if (result.business) {
        // Refresh the businesses list
        await loadBusinesses();
        return { 
          success: true, 
          business: result.business,
          errors: undefined,
          duplicateError: undefined
        };
      } else {
        return { 
          success: false, 
          business: undefined,
          errors: result.errors,
          duplicateError: result.duplicateError 
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create business';
      setError(errorMessage);
      return { 
        success: false, 
        business: undefined,
        errors: { name: errorMessage },
        duplicateError: undefined
      };
    } finally {
      setOperationLoading(false);
    }
  }, [loadBusinesses]);

  const hasBusinesses = businesses.length > 0;
  const activeBusiness = businesses.find(b => !b.isDeleted) || businesses[0] || null;

  return {
    businesses,
    activeBusiness,
    hasBusinesses,
    loading,
    operationLoading,
    error,
    refreshBusinesses,
    createBusiness
  };
};