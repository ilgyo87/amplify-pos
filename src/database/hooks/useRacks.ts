import { useState, useEffect, useCallback } from 'react';
import { Subscription } from 'rxjs';
import { RackDocument } from '../schemas/rack';
import { rackService } from '../services/rackService';

interface UseRacksReturn {
  racks: RackDocument[];
  activeRacks: RackDocument[];
  loading: boolean;
  error: string | null;
  searchResults: RackDocument[];
  isSearching: boolean;
  createRack: (rackNumber: string, description?: string, location?: string, capacity?: number) => Promise<{ success: boolean; rack?: RackDocument; error?: string }>;
  updateRack: (id: string, updates: { description?: string; location?: string; capacity?: number }) => Promise<{ success: boolean; rack?: RackDocument; error?: string }>;
  deleteRack: (id: string) => Promise<boolean>;
  toggleRackStatus: (id: string) => Promise<boolean>;
  searchRacks: (query: string) => Promise<void>;
  clearSearch: () => void;
  refreshRacks: () => Promise<void>;
  rackExists: (rackNumber: string) => Promise<boolean>;
  getRackByNumber: (rackNumber: string) => Promise<RackDocument | null>;
}

export function useRacks(): UseRacksReturn {
  const [racks, setRacks] = useState<RackDocument[]>([]);
  const [activeRacks, setActiveRacks] = useState<RackDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<RackDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize and load racks
  const loadRacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await rackService.initialize();
      const [allRacks, active] = await Promise.all([
        rackService.getAllRacks(),
        rackService.getActiveRacks()
      ]);
      
      setRacks(allRacks);
      setActiveRacks(active);
    } catch (err) {
      console.error('Error loading racks:', err);
      setError('Failed to load racks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to rack changes
  useEffect(() => {
    let subscription: Subscription;

    const setupSubscription = async () => {
      try {
        await rackService.initialize();
        
        subscription = rackService.subscribeToChanges((updatedRacks) => {
          setRacks(updatedRacks);
          
          // Update active racks
          const active = updatedRacks.filter(rack => rack.isActive);
          setActiveRacks(active);
          
          // Update search results if searching
          if (searchQuery) {
            const filtered = updatedRacks.filter(rack => 
              rack.rackNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (rack.description && rack.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (rack.location && rack.location.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setSearchResults(filtered);
          }
        });
      } catch (err) {
        console.error('Error setting up rack subscription:', err);
      }
    };

    loadRacks();
    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadRacks, searchQuery]);

  // Create a new rack
  const createRack = useCallback(async (
    rackNumber: string, 
    description?: string, 
    location?: string, 
    capacity?: number
  ): Promise<{ success: boolean; rack?: RackDocument; error?: string }> => {
    try {
      // Check if rack number already exists
      const exists = await rackService.rackExists(rackNumber);
      if (exists) {
        return { success: false, error: 'Rack number already exists' };
      }

      const rack = await rackService.createRack({
        rackNumber: rackNumber.trim(),
        description: description?.trim(),
        location: location?.trim(),
        capacity,
        isActive: true
      });

      if (rack) {
        return { success: true, rack };
      } else {
        return { success: false, error: 'Failed to create rack' };
      }
    } catch (err) {
      console.error('Error creating rack:', err);
      return { success: false, error: 'Failed to create rack' };
    }
  }, []);

  // Update a rack
  const updateRack = useCallback(async (
    id: string,
    updates: { description?: string; location?: string; capacity?: number }
  ): Promise<{ success: boolean; rack?: RackDocument; error?: string }> => {
    try {
      const rack = await rackService.updateRack(id, {
        description: updates.description?.trim(),
        location: updates.location?.trim(),
        capacity: updates.capacity
      });

      if (rack) {
        return { success: true, rack };
      } else {
        return { success: false, error: 'Failed to update rack' };
      }
    } catch (err) {
      console.error('Error updating rack:', err);
      return { success: false, error: 'Failed to update rack' };
    }
  }, []);

  // Delete a rack
  const deleteRack = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await rackService.deleteRack(id);
    } catch (err) {
      console.error('Error deleting rack:', err);
      return false;
    }
  }, []);

  // Toggle rack status
  const toggleRackStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await rackService.toggleRackStatus(id);
    } catch (err) {
      console.error('Error toggling rack status:', err);
      return false;
    }
  }, []);

  // Search racks
  const searchRacks = useCallback(async (query: string) => {
    try {
      setIsSearching(true);
      setSearchQuery(query);
      
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results = await rackService.searchRacks(query.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching racks:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Refresh racks
  const refreshRacks = useCallback(async () => {
    await loadRacks();
  }, [loadRacks]);

  // Check if rack exists
  const rackExists = useCallback(async (rackNumber: string): Promise<boolean> => {
    try {
      return await rackService.rackExists(rackNumber);
    } catch (err) {
      console.error('Error checking rack existence:', err);
      return false;
    }
  }, []);

  // Get rack by number
  const getRackByNumber = useCallback(async (rackNumber: string): Promise<RackDocument | null> => {
    try {
      return await rackService.getRackByNumber(rackNumber);
    } catch (err) {
      console.error('Error getting rack by number:', err);
      return null;
    }
  }, []);

  return {
    racks,
    activeRacks,
    loading,
    error,
    searchResults,
    isSearching,
    createRack,
    updateRack,
    deleteRack,
    toggleRackStatus,
    searchRacks,
    clearSearch,
    refreshRacks,
    rackExists,
    getRackByNumber
  };
}

// Hook for single rack
export function useRack(rackNumber: string) {
  const [rack, setRack] = useState<RackDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Subscription;

    const loadRack = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await rackService.initialize();
        const rackDoc = await rackService.getRackByNumber(rackNumber);
        
        if (rackDoc) {
          setRack(rackDoc);
          
          // Subscribe to changes
          subscription = rackService.subscribeToChanges((racks) => {
            const updated = racks.find(r => r.rackNumber === rackNumber);
            if (updated) {
              setRack(updated);
            }
          });
        } else {
          setError('Rack not found');
        }
      } catch (err) {
        console.error('Error loading rack:', err);
        setError('Failed to load rack');
      } finally {
        setLoading(false);
      }
    };

    if (rackNumber) {
      loadRack();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [rackNumber]);

  return { rack, loading, error };
}