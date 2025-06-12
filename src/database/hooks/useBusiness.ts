import { useState, useEffect, useCallback } from 'react';
import { businessService } from '../services/businessService';
import { BusinessDocument } from '../schemas/business';

export const useBusiness = () => {
  const [businesses, setBusinesses] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
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

  const hasBusinesses = businesses.length > 0;
  const activeBusiness = businesses.find(b => !b.isDeleted) || businesses[0] || null;

  return {
    businesses,
    activeBusiness,
    hasBusinesses,
    loading,
    error,
    refreshBusinesses
  };
};