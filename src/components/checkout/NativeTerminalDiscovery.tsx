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
import { useNativeStripeTerminal } from '../../hooks/useNativeStripeTerminal';

interface NativeTerminalDiscoveryProps {
  onReaderSelected: (reader: any) => void;
  useSimulated: boolean;
  connectionToken: string;
}

export function NativeTerminalDiscovery({ 
  onReaderSelected, 
  useSimulated,
  connectionToken 
}: NativeTerminalDiscoveryProps) {
  const [hasStarted, setHasStarted] = useState(false);
  
  const {
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
    cancelDiscovery,
  } = useNativeStripeTerminal();

  // Initialize on mount
  useEffect(() => {
    if (isAvailable && connectionToken && !isInitialized) {
      initialize(connectionToken);
    }
  }, [isAvailable, connectionToken, isInitialized, initialize]);

  // Auto-connect if only one reader found
  useEffect(() => {
    if (discoveredReaders.length === 1 && !connectedReader && !isDiscovering) {
      const reader = discoveredReaders[0];
      if (!reader.simulated || useSimulated) {
        handleConnectReader(reader);
      }
    }
  }, [discoveredReaders, connectedReader, isDiscovering, useSimulated]);

  const startDiscovery = async () => {
    if (!isInitialized) {
      Alert.alert('Not Ready', 'Terminal is still initializing. Please wait.');
      return;
    }

    setHasStarted(true);
    await discoverReaders(useSimulated);
  };

  const handleConnectReader = async (reader: any) => {
    const success = await connectReader(reader);
    if (success) {
      onReaderSelected(reader);
      Alert.alert('Success', `Connected to ${reader.label || reader.serialNumber}`);
    }
  };

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Native Terminal is only available on iOS devices
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={48} color="#dc3545" />
        <Text style={styles.errorTitle}>Terminal Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={startDiscovery}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasStarted) {
    return (
      <View style={styles.container}>
        <Ionicons 
          name={useSimulated ? "phone-portrait" : "bluetooth"} 
          size={48} 
          color="#007AFF" 
        />
        <Text style={styles.title}>
          {useSimulated ? 'Find Test Readers' : 'Find M2 Reader'}
        </Text>
        <Text style={styles.subtitle}>
          Using Native iOS Terminal SDK
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, !isInitialized && styles.disabledButton]}
          onPress={startDiscovery}
          disabled={!isInitialized}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {isInitialized ? 'Start Discovery' : 'Initializing...'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isDiscovering) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.discoveringText}>
          {useSimulated ? 'Finding test readers...' : 'Searching for M2 readers...'}
        </Text>
        <Text style={styles.discoveringHint}>
          Make sure your reader is powered on and nearby
        </Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelDiscovery}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.resultsTitle}>
        {discoveredReaders.length > 0 
          ? `Found ${discoveredReaders.length} reader${discoveredReaders.length > 1 ? 's' : ''}`
          : 'No readers found'}
      </Text>
      
      {discoveredReaders.map((reader, index) => (
        <TouchableOpacity
          key={reader.serialNumber || index}
          style={styles.readerItem}
          onPress={() => handleConnectReader(reader)}
        >
          <View style={styles.readerInfo}>
            <Text style={styles.readerName}>
              {reader.label || reader.serialNumber}
            </Text>
            <Text style={styles.readerDetails}>
              {reader.deviceType} • {reader.simulated ? 'Test Reader' : 'Physical Reader'}
              {reader.batteryLevel ? ` • ${reader.batteryLevel}% battery` : ''}
            </Text>
            {reader.id && (
              <Text style={styles.readerId}>ID: {reader.id}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        style={styles.searchAgainButton}
        onPress={startDiscovery}
      >
        <Text style={styles.searchAgainButtonText}>Search Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
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
  disabledButton: {
    opacity: 0.6,
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
  cancelButton: {
    marginTop: 20,
    padding: 12,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
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
    width: '100%',
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
  readerId: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  searchAgainButton: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  searchAgainButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});