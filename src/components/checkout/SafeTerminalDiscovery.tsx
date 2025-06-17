import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';

interface SafeTerminalDiscoveryProps {
  onReaderSelected: (reader: any) => void;
  useSimulated: boolean;
}

export function SafeTerminalDiscovery({ onReaderSelected, useSimulated }: SafeTerminalDiscoveryProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [readers, setReaders] = useState<any[]>([]);
  const [hasStartedDiscovery, setHasStartedDiscovery] = useState(false);
  
  const {
    discoverReaders,
    isInitialized,
    cancelDiscovering,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (discoveredReaders) => {
      console.log('[SAFE DISCOVERY] Found readers:', discoveredReaders.length);
      setReaders(discoveredReaders);
      // If we found readers, we're no longer discovering
      if (discoveredReaders.length > 0) {
        setIsDiscovering(false);
      }
    },
  });

  // Clean up only on unmount
  useEffect(() => {
    return () => {
      // Only cancel if we're still discovering and have no readers
      if (isDiscovering && readers.length === 0) {
        console.log('[SAFE DISCOVERY] Cancelling discovery on cleanup');
        cancelDiscovering().catch(console.error);
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Reset when switching between simulated and real
  useEffect(() => {
    setReaders([]);
    setHasStartedDiscovery(false);
    if (isDiscovering) {
      cancelDiscovering().catch(console.error);
      setIsDiscovering(false);
    }
  }, [useSimulated]);

  const startDiscovery = async () => {
    if (!isInitialized) {
      Alert.alert('Not Ready', 'Terminal is still initializing. Please wait.');
      return;
    }

    if (isDiscovering) {
      console.log('[SAFE DISCOVERY] Already discovering');
      return;
    }

    try {
      setIsDiscovering(true);
      setHasStartedDiscovery(true);
      setReaders([]);

      console.log('[SAFE DISCOVERY] Starting discovery with simulated:', useSimulated);

      // For iOS, we need to handle Bluetooth discovery carefully
      if (!useSimulated && Platform.OS === 'ios') {
        // Add a delay to ensure system is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const { error } = await discoverReaders({
        discoveryMethod: useSimulated ? 'internet' : 'bluetoothScan',
        simulated: useSimulated,
        // Don't use timeout for bluetooth - let user control when to stop
      });

      if (error) {
        console.error('[SAFE DISCOVERY] Discovery error:', error);
        // Don't show error if it's just a cancellation and we have readers
        if (error.code === 'Canceled' && readers.length > 0) {
          console.log('[SAFE DISCOVERY] Discovery cancelled but readers found, ignoring error');
          return;
        }
        
        if (error.message?.includes('Bluetooth') && !useSimulated) {
          Alert.alert(
            'Bluetooth Error',
            'Please ensure Bluetooth is enabled and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => startDiscovery() }
            ]
          );
        } else if (error.code !== 'Canceled') {
          Alert.alert('Discovery Error', error.message || 'Failed to discover readers');
        }
      }
    } catch (error: any) {
      console.error('[SAFE DISCOVERY] Unexpected error:', error);
      Alert.alert(
        'Discovery Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      // Always set discovering to false when discovery completes
      setIsDiscovering(false);
    }
  };

  const stopDiscovery = async () => {
    try {
      await cancelDiscovering();
      setIsDiscovering(false);
    } catch (error) {
      console.error('[SAFE DISCOVERY] Error cancelling discovery:', error);
    }
  };

  return (
    <View style={styles.container}>
      {!hasStartedDiscovery ? (
        <View style={styles.startContainer}>
          <Ionicons 
            name={useSimulated ? "phone-portrait" : "bluetooth"} 
            size={48} 
            color="#007AFF" 
          />
          <Text style={styles.title}>
            {useSimulated ? 'Find Test Readers' : 'Find M2 Reader'}
          </Text>
          <Text style={styles.subtitle}>
            {useSimulated 
              ? 'Discover simulated readers for testing'
              : 'Make sure your M2 reader is powered on'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startDiscovery}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Discovery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.discoveryContainer}>
          {isDiscovering ? (
            <View style={styles.discoveringSection}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.discoveringText}>
                {useSimulated ? 'Finding test readers...' : 'Searching for M2 readers...'}
              </Text>
              <Text style={styles.discoveringHint}>
                {useSimulated 
                  ? 'This should only take a moment'
                  : 'Make sure Bluetooth is enabled and your M2 is nearby'}
              </Text>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 20 }]}
                onPress={stopDiscovery}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>
                {readers.length > 0 
                  ? `Found ${readers.length} reader${readers.length > 1 ? 's' : ''}`
                  : 'No readers found'}
              </Text>
              
              {readers.map((reader, index) => (
                <TouchableOpacity
                  key={reader.serialNumber || index}
                  style={styles.readerItem}
                  onPress={() => onReaderSelected(reader)}
                >
                  <View style={styles.readerInfo}>
                    <Text style={styles.readerName}>
                      {reader.label || reader.serialNumber}
                    </Text>
                    <Text style={styles.readerDetails}>
                      {reader.deviceType} • {reader.simulated ? 'Test Reader' : 'Physical Reader'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 20 }]}
                onPress={startDiscovery}
              >
                <Text style={styles.secondaryButtonText}>Search Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  startContainer: {
    alignItems: 'center',
  },
  discoveryContainer: {
    minHeight: 200,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  discoveringSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  discoveringText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    fontWeight: '500',
  },
  discoveringHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsSection: {
    paddingVertical: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  readerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  readerInfo: {
    flex: 1,
  },
  readerName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  readerDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});