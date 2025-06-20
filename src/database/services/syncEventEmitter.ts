import { EventEmitter } from 'events';

class SyncEventEmitter extends EventEmitter {
  private static instance: SyncEventEmitter;

  private constructor() {
    super();
  }

  static getInstance(): SyncEventEmitter {
    if (!SyncEventEmitter.instance) {
      SyncEventEmitter.instance = new SyncEventEmitter();
    }
    return SyncEventEmitter.instance;
  }

  emitSyncComplete() {
    this.emit('syncComplete');
  }

  onSyncComplete(callback: () => void) {
    this.on('syncComplete', callback);
    return () => this.off('syncComplete', callback);
  }
}

export const syncEventEmitter = SyncEventEmitter.getInstance();