import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { stripeTerminalService } from '../../services/stripe/StripeTerminalService';
import { SafeTerminalDiscovery } from '../checkout/SafeTerminalDiscovery';
import { getCurrentUser } from 'aws-amplify/auth';

export function StripeTerminalSettingsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectionToken, setConnectionToken] = useState('');
  const [readerUpdateProgress, setReaderUpdateProgress] = useState<number | null>(null);
  const [isUpdatingReader, setIsUpdatingReader] = useState(false);
  const [updateEstimate, setUpdateEstimate] = useState<string>('');

  const {
    isInitialized,
    connectedReader,
    disconnectReader,
    connectReader,
    discoverReaders,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      console.log('[TERMINAL SETTINGS] Discovered readers:', readers);
      setIsDiscovering(false);
    },
    onDidStartInstallingUpdate: (update) => {
      console.log('[TERMINAL SETTINGS] Update started:', update);
      setIsUpdatingReader(true);
      setReaderUpdateProgress(0);
      
      // Convert estimate to user-friendly string
      const estimates: Record<string, string> = {
        'estimate5To15Minutes': '5-15 minutes',
        'estimate2To5Minutes': '2-5 minutes',
        'estimate1To2Minutes': '1-2 minutes',
        'estimateLessThan1Minute': 'Less than 1 minute'
      };
      setUpdateEstimate(estimates[update.estimatedUpdateTime] || '5-15 minutes');
    },
    onDidReportReaderSoftwareUpdateProgress: (progress) => {
      console.log('[TERMINAL SETTINGS] Update progress:', progress);
      const percentComplete = Math.round(parseFloat(progress) * 100);
      setReaderUpdateProgress(percentComplete);
    },
    onDidFinishInstallingUpdate: (update) => {
      console.log('[TERMINAL SETTINGS] Update finished:', { update });
      setIsUpdatingReader(false);
      setReaderUpdateProgress(null);
      setUpdateEstimate('');
      
      if (update?.error) {
        Alert.alert('Update Failed', 'The reader update failed. Please try connecting again.');
      } else {
        Alert.alert('Update Complete', 'Your reader has been updated successfully!');
      }
    },
  });

  // Fetch connection token when component mounts
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const currentUser = await getCurrentUser();
        const userId = currentUser.userId;
        const token = await stripeTerminalService.fetchConnectionToken(userId);
        if (token) {
          setConnectionToken(token);
        }
      } catch (error) {
        console.error('[TERMINAL SETTINGS] Error fetching connection token:', error);
      }
    };
    
    fetchToken();
  }, []);

  const handleConnectReader = async (reader: any) => {
    try {
      console.log('[TERMINAL SETTINGS] Connecting to reader:', reader);
      
      // Get the location ID from our service
      const { stripeLocationService } = await import('../../services/stripe/StripeLocationService');
      const locationId = await stripeLocationService.getLocationId();
      
      if (!locationId) {
        Alert.alert(
          'Location Required',
          'A location is required to connect to physical readers. Please ensure your Stripe account has a location configured.'
        );
        return;
      }
      
      // For M2 readers, handle the null ID issue
      if (!reader.id && reader.deviceType === 'stripeM2') {
        console.warn('[TERMINAL SETTINGS] M2 reader has null ID - using serialNumber as fallback');
        reader = { ...reader, id: reader.serialNumber };
      }
      
      // Connection parameters for physical readers
      const connectionParams = { 
        reader,
        locationId,
        autoReconnectOnUnexpectedDisconnect: true 
      };
      
      // Discovery method for physical readers
      const readerDiscoveryMethod = 'bluetoothScan';
      
      const { reader: connectedReaderResult, error } = await connectReader(
        connectionParams,
        readerDiscoveryMethod
      );

      if (error) {
        console.error('[TERMINAL SETTINGS] Connection error:', error);
        Alert.alert('Connection Error', error.message || 'Failed to connect to reader');
        return;
      }
      
      Alert.alert('Success', 'Card reader connected successfully');
    } catch (error: any) {
      console.error('Failed to connect reader:', error);
      Alert.alert(
        'Connection Error', 
        error.message || 'Failed to connect to card reader. Please try again.'
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectReader();
      Alert.alert('Disconnected', 'Reader disconnected successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to disconnect reader');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleContainer}>
          <Ionicons name="card-outline" size={24} color="#007AFF" />
          <Text style={styles.title}>Card Reader (Terminal)</Text>
        </View>
        <View style={styles.headerRight}>
          {connectedReader && (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
          )}
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {!isInitialized ? (
            <View style={styles.notInitializedContainer}>
              <Ionicons name="information-circle" size={48} color="#ff9500" />
              <Text style={styles.notInitializedText}>
                Terminal is initializing. Please ensure Stripe is connected in the settings above.
              </Text>
            </View>
          ) : connectedReader ? (
            <View style={styles.connectedContainer}>
              {/* Reader Update Progress UI */}
              {isUpdatingReader && (
                <View style={styles.updateContainer}>
                  <View style={styles.updateHeader}>
                    <Ionicons name="download-outline" size={24} color="#007AFF" />
                    <Text style={styles.updateTitle}>Updating Reader Software</Text>
                  </View>
                  
                  <Text style={styles.updateDescription}>
                    Your reader is downloading a required software update. Please keep the reader powered on and nearby.
                  </Text>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill,
                          { width: `${readerUpdateProgress || 0}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {readerUpdateProgress || 0}%
                    </Text>
                  </View>
                  
                  {updateEstimate && (
                    <Text style={styles.updateEstimate}>
                      Estimated time: {updateEstimate}
                    </Text>
                  )}
                  
                  <Text style={styles.updateWarning}>
                    ⚠️ Do not close the app or turn off the reader during the update
                  </Text>
                </View>
              )}
              
              {!isUpdatingReader && (
                <>
                  <View style={styles.readerInfo}>
                    <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                    <View style={styles.readerDetails}>
                      <Text style={styles.readerName}>
                        {connectedReader.label || connectedReader.serialNumber}
                      </Text>
                      <Text style={styles.readerSubtext}>
                        {connectedReader.deviceType} • Physical Reader
                      </Text>
                      {connectedReader.batteryLevel && (
                        <Text style={styles.readerBattery}>
                          Battery: {Math.round(connectedReader.batteryLevel * 100)}%
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.disconnectButton} 
                    onPress={handleDisconnect}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                    <Text style={styles.disconnectButtonText}>Disconnect Reader</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.setupContainer}>
              <Text style={styles.setupDescription}>
                Connect a card reader to accept in-person payments
              </Text>
              
              <SafeTerminalDiscovery
                onReaderSelected={handleConnectReader}
                useSimulated={false}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  connectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#155724',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notInitializedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  notInitializedText: {
    fontSize: 14,
    color: '#ff9500',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  connectedContainer: {
    paddingTop: 16,
  },
  readerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  readerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  readerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readerSubtext: {
    fontSize: 14,
    color: '#666',
  },
  readerBattery: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  setupContainer: {
    paddingTop: 16,
  },
  setupDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  updateContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  updateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  updateEstimate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  updateWarning: {
    fontSize: 13,
    color: '#ff9500',
    textAlign: 'center',
    fontWeight: '500',
  },
});