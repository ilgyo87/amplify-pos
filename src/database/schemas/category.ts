import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface CategoryDocType {
  id: string;
  name: string;
  color: string;
  businessId?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean; // For soft deletes
  lastSyncedAt?: string;
  amplifyId?: string; // Store the Amplify ID when synced
  createdAt: string;
  updatedAt: string;
}

export const categorySchema: RxJsonSchema<CategoryDocType> = {
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
      maxLength: 100
    },
    color: {
      type: 'string',
      maxLength: 20
    },
    businessId: {
      type: 'string',
      maxLength: 100
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    displayOrder: {
      type: 'integer'
    },
    isActive: {
      type: 'boolean',
      default: true
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
  required: ['id', 'name', 'color', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'name',
    'businessId',
    'isLocalOnly',
    'lastSyncedAt'
  ]
};

// Document type
export type CategoryDocument = RxDocument<CategoryDocType>;

// Collection type
export type CategoryCollection = RxCollection<CategoryDocType>;