import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { StripeTerminalBridge } = NativeModules;

class NativeStripeTerminal {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<string, any> = new Map();

  constructor() {
    if (Platform.OS === 'ios' && StripeTerminalBridge) {
      this.eventEmitter = new NativeEventEmitter(StripeTerminalBridge);
    }
  }

  isAvailable(): boolean {
    return Platform.OS === 'ios' && !!StripeTerminalBridge;
  }

  async initialize(connectionToken: string, locationId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Native Stripe Terminal is only available on iOS');
    }
    
    return StripeTerminalBridge.initializeTerminal(connectionToken, locationId);
  }

  async discoverReaders(simulated: boolean = false): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Native Stripe Terminal is only available on iOS');
    }
    
    return StripeTerminalBridge.discoverReaders(simulated);
  }

  async connectReader(reader: any): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Native Stripe Terminal is only available on iOS');
    }
    
    return StripeTerminalBridge.connectReader(reader);
  }

  async disconnectReader(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Native Stripe Terminal is only available on iOS');
    }
    
    return StripeTerminalBridge.disconnectReader();
  }

  async cancelDiscovery(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Native Stripe Terminal is only available on iOS');
    }
    
    return StripeTerminalBridge.cancelDiscovery();
  }

  onReadersDiscovered(callback: (readers: any[]) => void): () => void {
    if (!this.eventEmitter) return () => {};
    
    const listener = this.eventEmitter.addListener('readersDiscovered', (event) => {
      callback(event.readers || []);
    });
    
    this.listeners.set('readersDiscovered', listener);
    
    return () => {
      listener.remove();
      this.listeners.delete('readersDiscovered');
    };
  }

  onConnectionStatusChanged(callback: (status: string) => void): () => void {
    if (!this.eventEmitter) return () => {};
    
    const listener = this.eventEmitter.addListener('connectionStatusChanged', (event) => {
      callback(event.status);
    });
    
    this.listeners.set('connectionStatusChanged', listener);
    
    return () => {
      listener.remove();
      this.listeners.delete('connectionStatusChanged');
    };
  }

  onError(callback: (error: any) => void): () => void {
    if (!this.eventEmitter) return () => {};
    
    const listener = this.eventEmitter.addListener('terminalError', (event) => {
      callback(event);
    });
    
    this.listeners.set('terminalError', listener);
    
    return () => {
      listener.remove();
      this.listeners.delete('terminalError');
    };
  }

  removeAllListeners(): void {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners.clear();
  }
}

export const nativeStripeTerminal = new NativeStripeTerminal();