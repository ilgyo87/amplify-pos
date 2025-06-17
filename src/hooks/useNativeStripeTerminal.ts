import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { nativeStripeTerminal } from '../services/nativeStripeTerminal';
import { stripeLocationService } from '../services/stripeLocationService';

interface NativeReader {
  serialNumber: string;
  label: string;
  deviceType: string;
  simulated: boolean;
  id: string;
  status: string;
  batteryLevel?: number;
}

export function useNativeStripeTerminal() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredReaders, setDiscoveredReaders] = useState<NativeReader[]>([]);
  const [connectedReader, setConnectedReader] = useState<NativeReader | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('notConnected');
  const [error, setError] = useState<string | null>(null);

  const isAvailable = Platform.OS === 'ios' && nativeStripeTerminal.isAvailable();

  useEffect(() => {
    if (!isAvailable) return;

    // Set up event listeners
    const unsubscribeReaders = nativeStripeTerminal.onReadersDiscovered((readers) => {
      console.log('[NATIVE TERMINAL] Discovered readers:', readers);
      setDiscoveredReaders(readers);
    });

    const unsubscribeStatus = nativeStripeTerminal.onConnectionStatusChanged((status) => {
      console.log('[NATIVE TERMINAL] Connection status:', status);
      setConnectionStatus(status);
      if (status === 'connected') {
        setIsDiscovering(false);
      }
    });

    const unsubscribeError = nativeStripeTerminal.onError((error) => {
      console.error('[NATIVE TERMINAL] Error:', error);
      setError(error.error || 'Unknown error');
      setIsDiscovering(false);
    });

    return () => {
      unsubscribeReaders();
      unsubscribeStatus();
      unsubscribeError();
    };
  }, [isAvailable]);

  const initialize = useCallback(async (connectionToken: string) => {
    if (!isAvailable) {
      setError('Native Terminal not available');
      return false;
    }

    try {
      const locationId = await stripeLocationService.getLocationId();
      if (!locationId) {
        setError('No location ID available');
        return false;
      }

      await nativeStripeTerminal.initialize(connectionToken, locationId);
      setIsInitialized(true);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('[NATIVE TERMINAL] Initialize error:', err);
      setError(err.message || 'Failed to initialize');
      return false;
    }
  }, [isAvailable]);

  const discoverReaders = useCallback(async (simulated: boolean = false) => {
    if (!isAvailable || !isInitialized) {
      setError('Terminal not initialized');
      return;
    }

    try {
      setIsDiscovering(true);
      setError(null);
      setDiscoveredReaders([]);
      
      await nativeStripeTerminal.discoverReaders(simulated);
    } catch (err: any) {
      console.error('[NATIVE TERMINAL] Discovery error:', err);
      setError(err.message || 'Discovery failed');
      setIsDiscovering(false);
    }
  }, [isAvailable, isInitialized]);

  const connectReader = useCallback(async (reader: NativeReader) => {
    if (!isAvailable || !isInitialized) {
      setError('Terminal not initialized');
      return false;
    }

    try {
      setError(null);
      await nativeStripeTerminal.connectReader(reader);
      setConnectedReader(reader);
      return true;
    } catch (err: any) {
      console.error('[NATIVE TERMINAL] Connect error:', err);
      setError(err.message || 'Connection failed');
      return false;
    }
  }, [isAvailable, isInitialized]);

  const disconnectReader = useCallback(async () => {
    if (!isAvailable) return;

    try {
      await nativeStripeTerminal.disconnectReader();
      setConnectedReader(null);
      setError(null);
    } catch (err: any) {
      console.error('[NATIVE TERMINAL] Disconnect error:', err);
      setError(err.message || 'Disconnect failed');
    }
  }, [isAvailable]);

  const cancelDiscovery = useCallback(async () => {
    if (!isAvailable) return;

    try {
      await nativeStripeTerminal.cancelDiscovery();
      setIsDiscovering(false);
    } catch (err: any) {
      console.error('[NATIVE TERMINAL] Cancel discovery error:', err);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    isInitialized,
    isDiscovering,
    discoveredReaders,
    connectedReader,
    connectionStatus,
    error,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    cancelDiscovery,
  };
}