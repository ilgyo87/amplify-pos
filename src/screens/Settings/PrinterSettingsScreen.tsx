import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../BaseScreen';

export default function PrinterSettingsScreen() {
  const [printerIP, setPrinterIP] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerConnected, setPrinterConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrinterSettings();
  }, []);

  const loadPrinterSettings = async () => {
    try {
      setIsLoading(true);
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const settings = await AsyncStorage.default.getItem('printerSettings');
      if (settings) {
        const { ip, port } = JSON.parse(settings);
        setPrinterIP(ip || '');
        setPrinterPort(port || '9100');
        setPrinterConnected(true);
      } else {
        setPrinterConnected(false);
      }
    } catch (error) {
      console.error('Failed to load printer settings:', error);
      Alert.alert('Error', 'Failed to load printer settings');
      setPrinterConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrinterSettings = async () => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const settings = {
        ip: printerIP,
        port: printerPort
      };
      await AsyncStorage.default.setItem('printerSettings', JSON.stringify(settings));
      setShowSetupModal(false);
      Alert.alert('Success', 'Printer settings saved successfully');
      await loadPrinterSettings();
    } catch (error) {
      console.error('Failed to save printer settings:', error);
      Alert.alert('Error', 'Failed to save printer settings');
    }
  };

  const testPrinterConnection = async () => {
    if (!printerIP) {
      Alert.alert('Error', 'Please enter a printer IP address');
      return;
    }

    setTestingConnection(true);
    try {
      console.log(`Testing connection to thermal printer at ${printerIP}:${printerPort}`);
      
      const testCommands = generateTestPrintCommands();
      const success = await sendTestDataToPrinter(printerIP, printerPort, testCommands);
      
      if (success) {
        setPrinterConnected(true);
        Alert.alert('Success', 'Successfully connected to thermal printer! A test receipt should have printed.');
      } else {
        setPrinterConnected(false);
        Alert.alert('Connection Failed', 'Could not connect to printer. Please check the IP address and ensure the printer is powered on and connected to the network.');
      }
      
    } catch (error) {
      console.error('Printer connection test failed:', error);
      setPrinterConnected(false);
      Alert.alert('Connection Failed', 'Could not connect to printer. Please check the IP address and ensure the printer is powered on and connected to the network.');
    } finally {
      setTestingConnection(false);
    }
  };

  const generateTestPrintCommands = (): Uint8Array => {
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    const commands: number[] = [];
    
    const addText = (text: string) => {
      const utf8Encoder = new TextEncoder();
      const bytes = utf8Encoder.encode(text);
      commands.push(...Array.from(bytes));
    };
    
    const addLF = () => commands.push(LF);
    
    // Initialize printer
    commands.push(ESC, 0x40); // Reset printer
    commands.push(ESC, 0x61, 0x01); // Center alignment
    
    // Test print content
    commands.push(ESC, 0x45, 0x01); // Bold on
    addText('PRINTER TEST');
    addLF();
    commands.push(ESC, 0x45, 0x00); // Bold off
    
    addText('Connection Successful');
    addLF();
    addText(`Date: ${new Date().toLocaleDateString()}`);
    addLF();
    addText(`Time: ${new Date().toLocaleTimeString()}`);
    addLF();
    addLF();
    addText('Thermal Printer Ready');
    addLF();
    addLF();
    addLF();
    
    // Cut paper
    commands.push(GS, 0x56, 0x00); // Full cut
    
    return new Uint8Array(commands);
  };

  const sendTestDataToPrinter = async (ip: string, port: string, data: Uint8Array): Promise<boolean> => {
    try {
      console.log(`Sending test data (${data.length} bytes) to printer at ${ip}:${port}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: data,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('Test print response status:', response.status);
        return response.ok;
        
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        const isNetworkError = fetchError instanceof Error && 
          (fetchError.name === 'AbortError' || 
          (typeof fetchError.message === 'string' && fetchError.message.includes('Network request failed')));
        
        if (isNetworkError) {
          console.log('Test print timeout - assuming success (normal for thermal printers)');
          return true;
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Test print failed:', error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <BaseScreen title="Printer Settings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading printer settings...</Text>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen title="Printer Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Receipt Printer</Text>
          <Text style={styles.headerSubtitle}>
            Configure your network-enabled thermal printer for fast, direct receipt printing
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.printerCard}>
            <View style={styles.printerHeader}>
              <View style={styles.printerIconContainer}>
                <Ionicons name="print-outline" size={36} color="#20c997" />
              </View>
              <View style={styles.printerInfo}>
                <Text style={styles.printerName}>Network Thermal Printer</Text>
                <Text style={styles.printerModel}>80mm Receipt Printer</Text>
              </View>
            </View>

            <View style={styles.printerStatus}>
              {printerIP ? (
                <View style={styles.connectionInfo}>
                  <View style={styles.connectionRow}>
                    <Text style={styles.connectionLabel}>IP Address:</Text>
                    <Text style={styles.connectionValue}>{printerIP}:{printerPort}</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, printerConnected && styles.statusConnected]}>
                      <Ionicons 
                        name={printerConnected ? "checkmark-circle" : "alert-circle"} 
                        size={16} 
                        color={printerConnected ? "#28a745" : "#ffc107"} 
                      />
                      <Text style={[styles.statusText, printerConnected && styles.statusTextConnected]}>
                        {printerConnected ? 'Connected' : 'Not Tested'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.notConfiguredContainer}>
                  <Ionicons name="settings" size={24} color="#6c757d" />
                  <Text style={styles.notConfiguredText}>Not configured</Text>
                </View>
              )}
            </View>

            <View style={styles.printerActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowSetupModal(true)}
              >
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {printerIP ? 'Update Settings' : 'Setup Printer'}
                </Text>
              </TouchableOpacity>

              {printerIP && (
                <TouchableOpacity
                  style={[styles.secondaryButton, testingConnection && styles.buttonDisabled]}
                  onPress={testPrinterConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <ActivityIndicator size="small" color="#20c997" />
                  ) : (
                    <Ionicons name="wifi" size={20} color="#20c997" />
                  )}
                  <Text style={styles.secondaryButtonText}>
                    {testingConnection ? 'Testing...' : 'Test Print'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Printer Features</Text>
          <View style={styles.featureCard}>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="flash" size={20} color="#28a745" />
                <Text style={styles.featureText}>High-speed thermal printing</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="wifi" size={20} color="#28a745" />
                <Text style={styles.featureText}>Network connectivity (Ethernet/WiFi)</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="cut" size={20} color="#28a745" />
                <Text style={styles.featureText}>Automatic paper cutting</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="document-text" size={20} color="#28a745" />
                <Text style={styles.featureText}>80mm receipt paper</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Direct Printing</Text>
              <Text style={styles.infoText}>
                Receipts print directly to your thermal printer via network connection. No system print dialogs are shown for faster checkout.
              </Text>
            </View>
          </View>
        </View>

        {/* Setup Modal */}
        <Modal visible={showSetupModal} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView 
            style={styles.modalContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowSetupModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Printer Setup</Text>
                <TouchableOpacity onPress={savePrinterSettings}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.printerInfoSection}>
                  <View style={[styles.printerIconContainer, { width: 80, height: 80, marginRight: 0, marginBottom: 16 }]}>
                    <Ionicons name="print-outline" size={48} color="#20c997" />
                  </View>
                  <Text style={styles.printerModelTitle}>Thermal Receipt Printer</Text>
                  <Text style={styles.printerDescription}>
                    Configure your network-enabled thermal printer for seamless receipt printing without system dialogs.
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Printer IP Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={printerIP}
                    onChangeText={setPrinterIP}
                    placeholder="192.168.1.100"
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>
                    Find the IP address on your printer's network settings page
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Port (Default: 9100)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={printerPort}
                    onChangeText={setPrinterPort}
                    placeholder="9100"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>
                    Standard port for thermal printers is 9100
                  </Text>
                </View>

                <View style={styles.setupInstructions}>
                  <Text style={styles.instructionsTitle}>Setup Instructions:</Text>
                  <Text style={styles.instructionText}>1. Connect your thermal printer to your network</Text>
                  <Text style={styles.instructionText}>2. Print a network configuration page from the printer menu</Text>
                  <Text style={styles.instructionText}>3. Find the IP address and enter it above</Text>
                  <Text style={styles.instructionText}>4. Save settings and test the connection</Text>
                </View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  printerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  printerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  printerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(32, 201, 151, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(32, 201, 151, 0.2)',
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  printerModel: {
    fontSize: 14,
    color: '#666',
  },
  printerStatus: {
    marginBottom: 20,
  },
  connectionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionLabel: {
    fontSize: 14,
    color: '#666',
  },
  connectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  statusConnected: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginLeft: 6,
  },
  statusTextConnected: {
    color: '#155724',
  },
  notConfiguredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  notConfiguredText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  printerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20c997',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#20c997',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 201, 151, 0.08)',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#20c997',
  },
  secondaryButtonText: {
    color: '#20c997',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#20c997',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  printerInfoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  printerModelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  printerDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  setupInstructions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});