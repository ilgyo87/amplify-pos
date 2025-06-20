import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface RackDocType {
  id: string;
  rackNumber: string;
  description?: string;
  location?: string;
  isActive: boolean;
  capacity?: number; // Maximum number of items that can be stored
  currentLoad?: number; // Current number of items stored
  businessId?: string;
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean; // For soft deletes
  lastSyncedAt?: string;
  amplifyId?: string; // Store the Amplify ID when synced
  version?: number; // Version number for conflict detection
  createdAt: string;
  updatedAt: string;
}

export const rackSchema: RxJsonSchema<RackDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    rackNumber: {
      type: 'string',
      maxLength: 50
    },
    description: {
      type: ['string', 'null'],
      maxLength: 500
    },
    location: {
      type: ['string', 'null'],
      maxLength: 200
    },
    isActive: {
      type: 'boolean',
      default: true
    },
    capacity: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 9999
    },
    currentLoad: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 9999,
      default: 0
    },
    businessId: {
      type: ['string', 'null'],
      maxLength: 100
    },
    isLocalOnly: {
      type: 'boolean'
    },
    isDeleted: {
      type: 'boolean',
      default: false
    },
    lastSyncedAt: {
      type: ['string', 'null'],
      maxLength: 50
    },
    amplifyId: {
      type: ['string', 'null'],
      maxLength: 100
    },
    version: {
      type: 'number',
      minimum: 0,
      default: 1
    },
    createdAt: {
      type: 'string',
      maxLength: 50
    },
    updatedAt: {
      type: 'string',
      maxLength: 50
    }
  },
  required: ['id', 'rackNumber', 'isActive', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'rackNumber',
    'isActive',
    'isLocalOnly'
  ]
};

// Document type
export type RackDocument = RxDocument<RackDocType>;

// Collection type
export type RackCollection = RxCollection<RackDocType>;