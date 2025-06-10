import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface BusinessDocType {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  website?: string;
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean; // For soft deletes
  lastSyncedAt?: string;
  amplifyId?: string; // Store the Amplify ID when synced
  createdAt: string;
  updatedAt: string;
}

export const businessSchema: RxJsonSchema<BusinessDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 200
    },
    address: {
      type: 'string',
      maxLength: 500
    },
    city: {
      type: 'string',
      maxLength: 100
    },
    state: {
      type: 'string',
      maxLength: 50
    },
    zipCode: {
      type: 'string',
      maxLength: 20
    },
    phone: {
      type: 'string',
      maxLength: 20
    },
    email: {
      type: 'string',
      maxLength: 200
    },
    taxId: {
      type: 'string',
      maxLength: 50
    },
    website: {
      type: 'string',
      maxLength: 500
    },
    isLocalOnly: {
      type: 'boolean'
    },
    isDeleted: {
      type: 'boolean',
      default: false
    },
    lastSyncedAt: {
      type: 'string',
      maxLength: 50
    },
    amplifyId: {
      type: 'string',
      maxLength: 100
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
  required: ['id', 'name', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'name',
    'email',
    'phone',
    'isLocalOnly',
    'lastSyncedAt'
  ]
};

// Document type
export type BusinessDocument = RxDocument<BusinessDocType>;

// Collection type
export type BusinessCollection = RxCollection<BusinessDocType>;