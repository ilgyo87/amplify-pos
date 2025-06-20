export interface SyncOperation {
  entity: string;
  entityName: string;
  operation: 'added' | 'updated' | 'deleted';
  direction: 'to-cloud' | 'from-cloud';
  count: number;
  items?: string[]; // Optional list of item names
}

export interface SyncNotificationData {
  timestamp: string;
  operations: SyncOperation[];
  totalSynced: number;
  totalFailed: number;
  errors: string[];
  duration: number; // in milliseconds
}

export class SyncNotificationBuilder {
  private operations: SyncOperation[] = [];
  private errors: string[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  addOperation(
    entity: string,
    entityName: string,
    operation: 'added' | 'updated' | 'deleted',
    direction: 'to-cloud' | 'from-cloud',
    count: number,
    items?: string[]
  ) {
    // Check if we already have this operation type
    const existing = this.operations.find(
      op => op.entity === entity && op.operation === operation && op.direction === direction
    );

    if (existing) {
      existing.count += count;
      if (existing.items && items) {
        existing.items.push(...items);
      }
    } else {
      this.operations.push({
        entity,
        entityName,
        operation,
        direction,
        count,
        items: items || []
      });
    }
  }

  addError(error: string) {
    this.errors.push(error);
  }

  build(totalSynced: number, totalFailed: number): SyncNotificationData {
    return {
      timestamp: new Date().toISOString(),
      operations: this.operations,
      totalSynced,
      totalFailed,
      errors: this.errors,
      duration: Date.now() - this.startTime
    };
  }

  // Helper method to format notification for display
  static formatNotification(data: SyncNotificationData): string[] {
    const lines: string[] = [];
    
    if (data.operations.length === 0 && data.totalSynced === 0) {
      return ['Everything is up to date'];
    }

    // Group operations by direction
    const toCloudOps = data.operations.filter(op => op.direction === 'to-cloud');
    const fromCloudOps = data.operations.filter(op => op.direction === 'from-cloud');

    // Format uploads to cloud
    if (toCloudOps.length > 0) {
      lines.push('📤 Uploaded to cloud:');
      toCloudOps.forEach(op => {
        const icon = op.operation === 'added' ? '✅' : op.operation === 'updated' ? '🔄' : '🗑️';
        lines.push(`  ${icon} ${op.count} ${op.entityName} ${op.operation}`);
      });
    }

    // Format downloads from cloud
    if (fromCloudOps.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('📥 Downloaded from cloud:');
      fromCloudOps.forEach(op => {
        const icon = op.operation === 'added' ? '✅' : op.operation === 'updated' ? '🔄' : '🗑️';
        lines.push(`  ${icon} ${op.count} ${op.entityName} ${op.operation}`);
      });
    }

    // Add summary
    if (lines.length > 0) {
      lines.push('');
      lines.push(`⏱️ Completed in ${(data.duration / 1000).toFixed(1)}s`);
    }

    // Add errors if any
    if (data.errors.length > 0) {
      lines.push('');
      lines.push('⚠️ Errors:');
      data.errors.slice(0, 3).forEach(error => {
        lines.push(`  • ${error}`);
      });
      if (data.errors.length > 3) {
        lines.push(`  • ...and ${data.errors.length - 3} more`);
      }
    }

    return lines;
  }
}