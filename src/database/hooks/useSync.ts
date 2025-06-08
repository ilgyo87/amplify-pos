import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus, SyncResult } from '../services/syncService';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isUploading: false,
    isDownloading: false,
    totalLocalCustomers: 0,
    totalUnsyncedCustomers: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadCustomers = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setError(null);
      setSyncStatus(prev => ({ ...prev, isUploading: true }));
      const result = await syncService.uploadCustomers();
      await refreshStatus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setSyncStatus(prev => ({ ...prev, isUploading: false }));
    }
  }, [refreshStatus]);

  const downloadCustomers = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setError(null);
      setSyncStatus(prev => ({ ...prev, isDownloading: true }));
      const result = await syncService.downloadCustomers();
      await refreshStatus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      return null;
    } finally {
      setSyncStatus(prev => ({ ...prev, isDownloading: false }));
    }
  }, [refreshStatus]);

  const fullSync = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setError(null);
      setSyncStatus(prev => ({ ...prev, isUploading: true, isDownloading: true }));
      const result = await syncService.fullSync();
      await refreshStatus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      return null;
    } finally {
      setSyncStatus(prev => ({ ...prev, isUploading: false, isDownloading: false }));
    }
  }, [refreshStatus]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    syncStatus,
    loading,
    error,
    refreshStatus,
    uploadCustomers,
    downloadCustomers,
    fullSync,
    clearError: () => setError(null)
  };
};